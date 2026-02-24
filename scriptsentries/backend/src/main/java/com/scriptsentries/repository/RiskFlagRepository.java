package com.scriptsentries.repository;

import com.scriptsentries.model.RiskFlag;
import com.scriptsentries.model.Script;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskFlagRepository extends JpaRepository<RiskFlag, Long> {

    @Query("""
            SELECT r FROM RiskFlag r
            WHERE r.script = :script
            ORDER BY
                CASE r.severity
                    WHEN com.scriptsentries.model.enums.RiskSeverity.HIGH THEN 1
                    WHEN com.scriptsentries.model.enums.RiskSeverity.MEDIUM THEN 2
                    WHEN com.scriptsentries.model.enums.RiskSeverity.LOW THEN 3
                END,
                r.pageNumber ASC
            """)
    List<RiskFlag> findByScriptSortedBySeverity(@Param("script") Script script);
}