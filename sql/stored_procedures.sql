DELIMITER / /

DROP PROCEDURE IF EXISTS sp_get_partner_stats / /

CREATE PROCEDURE sp_get_partner_stats(
    IN p_range VARCHAR(20),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_start_date DATETIME;
    DECLARE v_end_date DATETIME;
    DECLARE v_offset INT;
    
    SET v_offset = (p_page - 1) * p_limit;
    
    CASE p_range
        WHEN 'today' THEN
            SET v_start_date = CURDATE();
            SET v_end_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) - INTERVAL 1 SECOND;
        WHEN 'yesterday' THEN
            SET v_start_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
            SET v_end_date = CURDATE() - INTERVAL 1 SECOND;
        WHEN '7_last_days' THEN
            SET v_start_date = DATE_SUB(CURDATE(), INTERVAL 7 DAY);
            SET v_end_date = NOW();
        WHEN 'this_month' THEN
            SET v_start_date = DATE_FORMAT(NOW(), '%Y-%m-01');
            SET v_end_date = LAST_DAY(NOW()) + INTERVAL 1 DAY - INTERVAL 1 SECOND;
        ELSE
            SET v_start_date = NULL;
            SET v_end_date = NULL;
    END CASE;
    
    SELECT COUNT(DISTINCT t.partner_id) INTO @total_count
    FROM trips t
    WHERE t.status = 'COMPLETED'
      AND (v_start_date IS NULL OR t.updated_at BETWEEN v_start_date AND v_end_date);
    
    SELECT 
        p.id AS partnerId,
        p.full_name AS partnerName,
        COUNT(t.trip_id) AS totalTrips,
        COALESCE(SUM(t.actual_guest_count), 0) AS totalGuests,
        COALESCE(SUM(t.reward_snapshot), 0) AS totalPoints,
        COALESCE(FLOOR(SUM(
            (t.reward_snapshot * COALESCE(sp.discount, 0)) / 
            NULLIF(100 - COALESCE(sp.discount, 0), 0)
        )), 0) AS totalDiscounted,
        COALESCE(ba.bank_name, '') AS bankName,
        COALESCE(ba.account_number, '') AS accountNumber,
        COALESCE(ba.account_holder_name, '') AS accountHolderName,
        @total_count AS total
    FROM trips t
    INNER JOIN users p ON t.partner_id = p.id
    LEFT JOIN bank_accounts ba ON ba.user_id = p.id
    LEFT JOIN service_points sp ON t.service_point_id = sp.id
    WHERE t.status = 'COMPLETED'
      AND (v_start_date IS NULL OR t.updated_at BETWEEN v_start_date AND v_end_date)
    GROUP BY p.id, p.full_name, ba.bank_name, ba.account_number, ba.account_holder_name
    ORDER BY totalTrips DESC
    LIMIT v_offset, p_limit;
    
END//

DROP PROCEDURE IF EXISTS sp_get_service_point_stats / /

CREATE PROCEDURE sp_get_service_point_stats(
    IN p_range VARCHAR(20),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_start_date DATETIME;
    DECLARE v_end_date DATETIME;
    DECLARE v_offset INT;
    
    SET v_offset = (p_page - 1) * p_limit;
    
    CASE p_range
        WHEN 'today' THEN
            SET v_start_date = CURDATE();
            SET v_end_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY) - INTERVAL 1 SECOND;
        WHEN 'yesterday' THEN
            SET v_start_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
            SET v_end_date = CURDATE() - INTERVAL 1 SECOND;
        WHEN '7_last_days' THEN
            SET v_start_date = DATE_SUB(CURDATE(), INTERVAL 7 DAY);
            SET v_end_date = NOW();
        WHEN 'this_month' THEN
            SET v_start_date = DATE_FORMAT(NOW(), '%Y-%m-01');
            SET v_end_date = LAST_DAY(NOW()) + INTERVAL 1 DAY - INTERVAL 1 SECOND;
        ELSE
            SET v_start_date = NULL;
            SET v_end_date = NULL;
    END CASE;
    
    SELECT COUNT(DISTINCT t.service_point_id) INTO @total_count
    FROM trips t
    WHERE t.status = 'COMPLETED'
      AND (v_start_date IS NULL OR t.updated_at BETWEEN v_start_date AND v_end_date);
    
    SELECT 
        sp.id AS servicePointId,
        sp.name AS servicePointName,
        COUNT(t.trip_id) AS totalTrips,
        COALESCE(SUM(t.actual_guest_count), 0) AS totalGuests,
        COALESCE(SUM(t.reward_snapshot), 0) AS totalCost,
        COALESCE(ba.bank_name, '') AS bankName,
        COALESCE(ba.account_number, '') AS accountNumber,
        COALESCE(ba.account_holder_name, '') AS accountHolderName,
        @total_count AS total
    FROM trips t
    INNER JOIN service_points sp ON t.service_point_id = sp.id
    LEFT JOIN users o ON sp.owner_id = o.id
    LEFT JOIN bank_accounts ba ON ba.user_id = o.id
    WHERE t.status = 'COMPLETED'
      AND (v_start_date IS NULL OR t.updated_at BETWEEN v_start_date AND v_end_date)
    GROUP BY sp.id, sp.name, ba.bank_name, ba.account_number, ba.account_holder_name
    ORDER BY totalTrips DESC
    LIMIT v_offset, p_limit;
    
END//

DELIMITER;