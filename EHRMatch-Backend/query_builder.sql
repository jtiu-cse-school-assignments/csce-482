-- @purpose:
--     Building queries and accessing mimic db directly.
-- NOTE :
--     DO NOT edit any of the queries below. Copy and paste a query you wish to work on or modify.
--     Please provide a short comment describing what the query does. To run on VS CODE highlight the sql query, right click, and click run query.
--     You must be connected to the database using the hostname, port, username, and password provided by Adam.

-- All of the vitals being pulled in mimic_pull_vitals file
SELECT  label, 
        itemid,
        unitname
FROM    mimiciii.D_ITEMS
WHERE   itemid IN ( 211, 220045, 3693, 581, 
                    763, 224639, 226531, 226512, 
                    618, 220210, 3603, 224689, 
                    615, 224690, 619, 614, 
                    224688, 651, 224422, 220050, 
                    51, 225309, 6701, 220051, 
                    8368, 225310, 8555, 220052, 
                    52, 225312, 6702, 220179, 
                    224167, 227243, 455, 3313, 
                    3315, 442, 3317, 3323, 
                    3321, 220180, 224643, 227242, 
                    8441, 8502, 8440, 8503, 
                    8504, 8507, 8506, 220181, 
                    456, 3312, 3314, 443, 
                    3316, 3322, 3320, 678, 
                    223761, 3652, 679, 3654, 
                    677, 3655, 676, 223762, 
                    646, 220277, 834, 220227 );

----------------------------USED IN CODE DO NOT EDIT-------------------------------------------

-- Chartevents query for heart rate
SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS HEARTRATE
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=152223 AND
        itemid IN ( 211, 20045 );

-- Chartevents query for height
SELECT ROUND ( CAST( AVG(valuenum) AS NUMERIC ), 2 ) AS HEIGHT
FROM   mimiciii.CHARTEVENTS 
WHERE  subject_id = 34 AND
       hadm_id = 144319 AND
       itemid = 226707;

-- Chartevents query for weight
-- NOTE: Some patients may not have a reading for a particular value under a specific admission id. 
-- What we decided to do is take the average of the df column and replace nan with 
-- said average.
-- Reference: https://www.displayr.com/5-ways-deal-missing-data-cluster-analysis/
-- note: 3693 is in gms?
-- note: 226512, 224639, 763, 581 are in kilograms
-- note: 226531
-- TODO: Talk to team about itemid 3693 being in gms so not really adding any value to our clustering
SELECT ROUND ( CAST( AVG(W) AS NUMERIC), 2 ) AS AVGWEIGHT FROM (   SELECT ROUND ( CAST( AVG(valuenum) AS NUMERIC ), 2 ) * 2.205 AS W
                                                                      FROM mimiciii.CHARTEVENTS
                                                                      WHERE  subject_id = 23 AND
                                                                             hadm_id = 124321 AND
                                                                             itemid IN ( 226512, 224639, 763, 581 )
                                                                      UNION
                                                                      SELECT ROUND ( CAST(AVG(valuenum) AS NUMERIC), 2 ) AS W
                                                                      FROM mimiciii.CHARTEVENTS
                                                                      WHERE  subject_id = 23 AND
                                                                             hadm_id = 124321 AND
                                                                             itemid IN ( 22653 ) ) AS WEIGHTBL;  


-- Old query that pulled the average weight but had incorrect values due to averaging both kgs and lbs and gms together
SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS PWEIGHT
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN ( 3693, 581, 763, 224639, 226531, 226512 );    


-- Chartevents query for respiratory rate
SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS RESPRATE
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN ( 618, 220210, 3603, 224689, 615, 224690, 619, 614, 224688, 651, 224422 );

-- Chartevents query for Arterial Systolic
SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS BPSYSTOLIC
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN ( 220050, 51, 225309, 6701, 220179, 224167, 227243, 455, 3313, 3315, 442, 3317, 3323, 3321 );

-- Chartevents query for Arterial Diastolic
SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS BPDIASTOLIC
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN ( 220051, 8368, 225310, 8555, 220180, 224643, 227242, 8441, 8502, 8440, 8503, 8504, 8507, 8506 );

-- Chartevents query for temperature
SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS F_TEMP
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN ( 678, 223761, 3652, 679, 3654 );

-- Chartevents query for average temperature
SELECT ROUND ( CAST( AVG(TEMP) AS NUMERIC), 2 ) AS AVGTEMP FROM (   SELECT  ROUND ( ((  (  CAST (AVG(valuenum) AS NUMERIC)  ) * (9.0/5.0) ) + 32.0), 2) as TEMP
                                                                    FROM    mimiciii.CHARTEVENTS
                                                                    WHERE   subject_id=24 AND 
                                                                            hadm_id=161859 AND
                                                                            itemid IN (677, 3655, 676, 223762)
                                                                    UNION
                                                                    SELECT  ROUND ( CAST (AVG (valuenum) AS NUMERIC), 2 ) AS TEMP
                                                                    FROM    mimiciii.CHARTEVENTS
                                                                    WHERE   subject_id=24 AND
                                                                            hadm_id=161859 AND
                                                                            itemid IN ( 678, 223761, 3652, 679, 3654 ) ) AS T;


-- Chartevents query for 02 Saturation
SELECT  ROUND( CAST( AVG(valuenum) AS NUMERIC ), 2 ) AS OXY_SAT
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN (220227, 220277);

-- Chartevents query for Sp02
SELECT  ROUND( CAST( AVG(valuenum) AS NUMERIC ), 2 ) AS SP_OXY
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN (646);

-- Chartevents query for Sa02
SELECT  ROUND( CAST( AVG(valuenum) AS NUMERIC ), 2 ) AS SA_OXY
FROM    mimiciii.CHARTEVENTS
WHERE   subject_id=23 AND
        hadm_id=124321 AND
        itemid IN (834);

------------------------------------------USED IN CODE DO NOT EDIT------------------------------------------------------------

-- Get all the admission ids of subject id 23
SELECT  subject_id,
        hadm_id
FROM mimiciii.ADMISSIONS
WHERE subject_id=22;

-- Count the number of unique subject ids in admissions
SELECT COUNT (DISTINCT subject_id)
FROM mimiciii.ADMISSIONS

-- Query given by nate with general vitals
SELECT icustay_id, 
       itemid, 
       valuenum, 
       charttime 
FROM   mimiciii.chartevents 
WHERE  icustay_id IN (SELECT icustay_id 
                      FROM   mimiciii.procedureevents_mv 
                      WHERE  itemid = 225792 
                             AND cancelreason = 0) 
       AND itemid IN ( 211, 220045, 3693, 581, 
                       763, 224639, 226531, 226512, 
                       618, 220210, 3603, 224689, 
                       615, 224690, 619, 614, 
                       224688, 651, 224422, 220050, 
                       51, 225309, 6701, 220051, 
                       8368, 225310, 8555, 220052, 
                       52, 225312, 6702, 220179, 
                       224167, 227243, 455, 3313, 
                       3315, 442, 3317, 3323, 
                       3321, 220180, 224643, 227242, 
                       8441, 8502, 8440, 8503, 
                       8504, 8507, 8506, 220181, 
                       456, 3312, 3314, 443, 
                       3316, 3322, 3320, 678, 
                       223761, 3652, 679, 3654, 
                       677, 3655, 676, 223762, 
                       646, 220277, 834, 220227 ); 


-- Get the icd9 code of a specific patient and admission id
EXPLAIN ANALYZE SELECT icd9_code
FROM mimiciii.DIAGNOSES_ICD
WHERE subject_id=23 AND hadm_id=124321;

-- Finds all the patients that fell under the same icd9 as 
-- subject 23 and their admission id 124321
SELECT subject_id, hadm_id
FROM mimiciii.DIAGNOSES_ICD
WHERE icd9_code IN (
                     SELECT icd9_code
                     FROM mimiciii.DIAGNOSES_ICD
                     WHERE subject_id=23 AND hadm_id=124321  
              );


-- Get all the unique subject ids from the table admissions
SELECT DISTINCT subject_id FROM mimiciii.ADMISSIONS;

-- Creates an index in chartevents
CREATE INDEX SId_AId_IId
ON mimiciii.CHARTEVENTS(subject_id, hadm_id, itemid);

-- Creates an index in admissions on subject id
CREATE INDEX SId_Admissions
ON mimiciii.ADMISSIONS(subject_id);

CREATE INDEX SId_AId
ON mimiciii.ADMISSIONS(subject_id, hadm_id);

-- Determines if a patient passed away
-- there are around 6000 patients that passed away during their admission in the db
SELECT * 
FROM   mimiciii.ADMISSIONS 
WHERE  CAST ( deathtime as CHAR) IS NOT NULL AND
       subject_id = 23 AND
       hadm_id = 124321;

-- gets all the admission and dischtime for a subject_id
SELECT hadm_id, 
       admittime, 
       dischtime 
FROM   mimiciii.ADMISSIONS 
WHERE  subject_id=23 
ORDER BY admittime ASC;

SELECT * FROM mimiciii.ADMISSIONS WHERE subject_id = 23


SELECT
				itemid,
				valuenum,
				valueuom,
				EXTRACT(epoch FROM (charttime - admittime)) / EXTRACT(epoch FROM dischtime - admittime) AS time
			FROM mimiciii.chartevents, mimiciii.admissions
			WHERE
				mimiciii.chartevents.subject_id=22 AND
				mimiciii.chartevents.hadm_id=165315 AND
				mimiciii.admissions.subject_id=22 AND
				mimiciii.admissions.hadm_id=165315 AND
				itemid IN (
					677, 3655, 676, 223762,
					678, 223761, 3652, 679,
					3654, 226512, 224639, 763,
					581, 22653, 220051, 8368,
					225310, 8555, 220180, 224643,
					227242, 8441, 8502, 8440,
					8503, 8504, 8507, 8506,
					220050, 51, 225309, 6701,
					220179, 224167, 227243, 455,
					3313, 3315, 442, 3317,
					3323, 3321, 618, 220210,
					3603, 224689, 615, 224690,
					619, 614, 224688, 651,
					224422, 211, 20045, 220227,
					220277, 646, 834
				)


SELECT 
  CASE
  WHEN CAST( deathtime AS CHAR ) IS NOT NULL THEN true
  ELSE false
  END
  AS died
FROM ADMISSIONS
WHERE subject_id=222