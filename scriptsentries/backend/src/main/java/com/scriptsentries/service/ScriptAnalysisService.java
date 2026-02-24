package com.scriptsentries.service;

import com.scriptsentries.dto.AiPageAnalysisResult;
import com.scriptsentries.model.*;
import com.scriptsentries.model.enums.ClearanceStatus;
import com.scriptsentries.model.enums.RiskCategory;
import com.scriptsentries.model.enums.RiskSeverity;
import com.scriptsentries.model.enums.RiskSubCategory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScriptAnalysisService {

    private final org.springframework.ai.chat.model.ChatModel chatModel;


    record AiPageResponse(List<AiPageAnalysisResult.AiRiskItem> risks) {}

    private static final String SYSTEM_PROMPT_TEMPLATE = """
            You are a Senior Media Law Attorney specializing in Hollywood production clearances.
            Analyze the provided script page for all legal and IP risks.

            CONTEXTUAL SENTIMENT ANALYSIS RULES (apply these strictly):

            1. PRODUCT/BRAND CONTEXT:
               - Hero/protagonist uses brand naturally in daily life → LOW severity, status: PERMISSIBLE, subCategory: BRAND_NAME_PRODUCTS
               - Villain uses brand OR brand used as weapon/drug paraphernalia/criminal tool → HIGH severity, category: PRODUCT_MISUSE, subCategory: PRODUCT_MISUSE
               - Brand shown prominently and positively → Consider MARKETING_ADDED_VALUE, subCategory: LOGOS_GRAPHICS
               - Brand mocked or defamed → HIGH severity, category: PRODUCT_MISUSE, subCategory: PRODUCT_MISUSE

            2. REAL PEOPLE:
               - Living celebrity mocked or placed in false scenario → HIGH, category: LIKENESS, subCategory: PARODIES_SPOOFS_IMITATIONS
               - Historical figure referenced neutrally → LOW, category: REFERENCES, subCategory: REFERENCES
               - Real politician depicted doing illegal acts → HIGH, category: LIKENESS, subCategory: NAME_AND_LIKENESS_USE

            3. MUSIC:
               - Song lyrics quoted (even partial) → HIGH, category: MUSIC_CHOREOGRAPHY, subCategory: MUSIC
               - Song title mentioned casually → LOW, category: REFERENCES, subCategory: REFERENCES
               - Specific choreography described → MEDIUM, category: MUSIC_CHOREOGRAPHY, subCategory: PLAYBACK

            4. LOCATIONS:
               - Actual private business named negatively → HIGH, category: LOCATIONS, subCategory: REAL_LOCALES_ENTITIES_LOGOS
               - Generic "coffee shop" → skip (no risk)
               - Named landmark used neutrally → LOW, category: LOCATIONS, subCategory: REAL_LOCALES_ENTITIES_LOGOS

            5. NUMBERS:
               - Any 10-digit phone number → MEDIUM, category: NAMES_NUMBERS, subCategory: TELEPHONE_NUMBERS
               - Website URLs (real) → MEDIUM, category: NAMES_NUMBERS, subCategory: ADDRESSES_URLS_LICENSE_NUMBERS
               - Actual street addresses → MEDIUM, category: NAMES_NUMBERS, subCategory: ADDRESSES_URLS_LICENSE_NUMBERS

            6. PROPS/WARDROBE:
               - Named designer item used normally → LOW, category: PROPS_SET_DRESSING, subCategory: BRAND_NAME_PRODUCTS
               - Military uniform used incorrectly → MEDIUM, category: WARDROBE, subCategory: WARDROBE

            STRICT MAPPING RULES:
            - You MUST provide a 'subCategory' for every risk.
            - Use only the following valid SubCategory values:
              [REAL_LIFE_CHARACTER_PORTRAYALS, REAL_LIFE_INCIDENT_DEPICTIONS, REAL_LOCALES_ENTITIES_LOGOS, 
               BEHAVIOR_OF_NOTE, CAMEOS, CROWD_ATMOSPHERE_EXTRAS, NAME_AND_LIKENESS_USE, PARODIES_SPOOFS_IMITATIONS,
               ADDRESSES_URLS_LICENSE_NUMBERS, NAMES_BUSINESS_ORGS, NAMES_CHARACTERS, TELEPHONE_NUMBERS,
               ALCOHOL_USE, ARTWORK, BRAND_NAME_PRODUCTS, LOGOS_GRAPHICS, TOBACCO, TOYS, 
               GOVERNMENT_AGENCIES_SEALS, MUSIC, PLAYBACK, PRODUCT_MISUSE, REFERENCES, VEHICLES, WARDROBE]
            - If no specific subCategory fits perfectly, you MUST use 'REFERENCES' as the default. Never return null.

            RESPONSE FORMAT:
            You must return a valid JSON object strictly adhering to this schema:
            {format}
            """;

    public List<RiskFlag> analyzeScript(List<String> pages, Script script) {
        log.info("Analyzing {} pages...", pages.size());
        var outputConverter = new BeanOutputConverter<>(new ParameterizedTypeReference<AiPageResponse>() {});

        return IntStream.range(0, pages.size())
                .parallel()
                .mapToObj(i -> analyzeSinglePage(i + 1, pages.get(i), script, outputConverter))
                .flatMap(List::stream)
                .toList();
    }

    private List<RiskFlag> analyzeSinglePage(int pageNumber, String pageText, Script script, BeanOutputConverter<AiPageResponse> converter) {
        if (pageText == null || pageText.isBlank()) return List.of();

        try {
            // 1. Manually prepare the text with the schema
            // We use .replace to avoid the Template Engine brace error
            String systemText = SYSTEM_PROMPT_TEMPLATE.replace("{format}", converter.getFormat());

            SystemMessage systemMessage = new SystemMessage(systemText);
            UserMessage userMessage = new UserMessage("PAGE " + pageNumber + ":\n\n" + pageText);

            // 2. Call the ChatModel directly (This is the most stable method)
            // This avoids the "Error while extracting response" because we handle the string content ourselves
            var response = chatModel.call(new Prompt(List.of(systemMessage, userMessage)));
            String rawJson = response.getResult().getOutput().getContent();

            // 3. Use the converter to turn raw JSON string into your Record
            AiPageResponse aiResponse = converter.convert(rawJson);

            return (aiResponse != null && aiResponse.risks() != null)
                    ? aiResponse.risks().stream().map(item -> mapToRiskFlag(item, pageNumber, script)).toList()
                    : List.of();

        } catch (Exception e) {
            log.error("Error analyzing page {}: {}", pageNumber, e.getMessage());
            return List.of();
        }
    }

    private RiskFlag mapToRiskFlag(AiPageAnalysisResult.AiRiskItem item, int pageNumber, Script script) {
        RiskCategory category = parseEnum(RiskCategory.class, item.getCategory(), RiskCategory.OTHER);

        // ← This line - always defaults to UNKNOWN if null
        RiskSubCategory subCategory = parseEnum(RiskSubCategory.class, item.getSubCategory(), RiskSubCategory.UNKNOWN);

        RiskSeverity severity = parseEnum(RiskSeverity.class, item.getSeverity(), RiskSeverity.MEDIUM);
        ClearanceStatus status = parseEnum(ClearanceStatus.class, item.getStatus(), ClearanceStatus.PENDING);

        return RiskFlag.builder()
                .category(category)
                .subCategory(subCategory)
                .severity(severity)
                .status(status)
                .entityName(item.getEntityName() != null ? item.getEntityName() : "Unknown")
                .snippet(truncate(item.getSnippet(), 500))
                .reason(item.getReason())
                .suggestion(item.getSuggestion())
                .pageNumber(pageNumber)
                .isRedacted(false)
                .script(script)
                .build();
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value, T defaultValue) {
        // ← Add this null/blank check
        if (value == null || value.isBlank() || value.equalsIgnoreCase("null")) {
            return defaultValue;
        }
        try {
            return Enum.valueOf(enumClass, value.toUpperCase()
                    .replace(" ", "_")
                    .replace("-", "_"));
        } catch (IllegalArgumentException e) {
            log.debug("Unknown enum value '{}' for {}, using default", value, enumClass.getSimpleName());
            return defaultValue;
        }
    }

    private String truncate(String input, int max) {
        if (input == null) return null;
        return input.length() > max ? input.substring(0, max - 3) + "..." : input;
    }
}