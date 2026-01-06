-- =====================================================
-- DATA MIGRATION: user_progress JSONB -> Normalized Tables
-- Run this AFTER 015_rollback_normalization.sql
-- =====================================================

-- Helper: Create temporary table to hold legacy data
CREATE TEMPORARY TABLE temp_user_progress (
    user_id UUID PRIMARY KEY,
    progress_data JSONB,
    sessions JSONB,
    schedule JSONB,
    activity_log JSONB,
    video_history JSONB
);

-- Insert legacy data into temp table
INSERT INTO temp_user_progress VALUES 
('1a25e9ed-6c4b-4bcf-a68f-9df49fd29bc4', 
 '{"hukuk_1":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"ekonomi_1":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],"yetenek_1":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],"yetenek_2":[60,61,73],"muhasebe_1":[1,2,3,4,5,6,7,8,9,10,11,12,13]}'::JSONB,
 '[{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1765184400000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765187400000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1765188000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765191000000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":1500,"timestamp":1765191600000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1765270800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765273800000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":300,"timestamp":1765274400000},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":3000,"timestamp":1765357200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765360200000},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":900,"timestamp":1765360800000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1765443600000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765446600000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1765447200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765450200000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":2400,"timestamp":1765450800000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1765530000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765533000000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1765533600000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765536600000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":1500,"timestamp":1765537200000},{"type":"work","pauses":[],"courseId":"yetenek_1","duration":3000,"timestamp":1765616400000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765619400000},{"type":"work","pauses":[],"courseId":"yetenek_1","duration":3000,"timestamp":1765620000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765623000000},{"type":"work","pauses":[],"courseId":"yetenek_1","duration":2100,"timestamp":1765623600000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1765789200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765792200000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1765792800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765795800000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1765796400000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1765875600000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765878600000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1765879200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765882200000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1765882800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765885800000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":1800,"timestamp":1765886400000},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":3000,"timestamp":1765962000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1765965000000},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":600,"timestamp":1765965600000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766048400000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766051400000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766052000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766055000000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766055600000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766058600000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766059200000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766134800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766137800000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766138400000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766141400000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766142000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766145000000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":300,"timestamp":1766145600000},{"type":"work","pauses":[],"courseId":"yetenek_1","duration":3000,"timestamp":1766221200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766224200000},{"type":"work","pauses":[],"courseId":"yetenek_1","duration":3000,"timestamp":1766224800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766227800000},{"type":"work","pauses":[],"courseId":"yetenek_1","duration":2100,"timestamp":1766228400000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766394000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766397000000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766397600000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766400600000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766401200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766404200000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":2700,"timestamp":1766404800000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766480400000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766483400000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766484000000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766487000000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766487600000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766490600000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":600,"timestamp":1766491200000},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":3000,"timestamp":1766566800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766569800000},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":2700,"timestamp":1766570400000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766653200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766656200000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1766656800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766659800000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":2100,"timestamp":1766660400000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766739600000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766742600000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1766743200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766746200000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":1800,"timestamp":1766746800000},{"type":"work","pauses":[],"courseId":"yetenek_2","duration":3000,"timestamp":1766833200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1766836200000},{"type":"work","pauses":[],"courseId":"yetenek_2","duration":3000,"timestamp":1766839800000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1767004200000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1767007200000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3000,"timestamp":1767007800000},{"type":"break","pauses":[],"courseId":null,"duration":600,"timestamp":1767010800000},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3600,"timestamp":1767011400000},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":806,"timestamp":1767089154464},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":3086,"timestamp":1767176977386},{"type":"break","pauses":[],"courseId":"general","duration":1520,"timestamp":1767180063680},{"type":"work","pauses":[{"end":1767182919525,"start":1767182575130}],"courseId":"muhasebe_1","duration":3029,"timestamp":1767181584103},{"type":"break","pauses":[],"courseId":"general","duration":500,"timestamp":1767184959375},{"type":"work","pauses":[],"courseId":"muhasebe_1","duration":0,"timestamp":1767185460404},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3387,"timestamp":1767262246023},{"type":"break","pauses":[],"courseId":"general","duration":1475,"timestamp":1767265633633},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3216,"timestamp":1767267109665},{"type":"work","pauses":[],"courseId":"hukuk_1","duration":3000,"timestamp":1767348000000},{"type":"work","pauses":[{"end":1767437400000,"start":1767436740000}],"courseId":"yetenek_2","duration":4740,"timestamp":1767434400000},{"type":"break","pauses":[],"courseId":"general","duration":1200,"timestamp":1767439800000},{"type":"break","pauses":[],"courseId":"general","duration":283,"timestamp":1767444801059},{"type":"work","pauses":[],"courseId":"yetenek_2","duration":3017,"timestamp":1767445085067},{"type":"break","pauses":[],"courseId":"general","duration":600,"timestamp":1767693000000},{"type":"break","pauses":[],"courseId":"general","duration":500,"timestamp":1767703359375},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":3068,"timestamp":1767603793473},{"type":"break","pauses":[],"courseId":"general","duration":645,"timestamp":1767606862338},{"type":"break","pauses":[],"courseId":"general","duration":467,"timestamp":1767611024304},{"type":"break","pauses":[],"courseId":"general","duration":500,"timestamp":1767615461982},{"type":"work","pauses":[],"courseId":"ekonomi_1","duration":2829,"timestamp":1767615962427}]'::JSONB,
 '{"CUMA":[{"time":"12:00-17:00","subject":"HUKUK"}],"SALI":[{"time":"12:00-17:00","subject":"HUKUK"}],"PERŞEMBE":[{"time":"12:00-17:00","subject":"EKONOMİ"}],"PAZARTESİ":[{"time":"12:00-17:00","subject":"EKONOMİ"}],"ÇARŞAMBA":[{"time":"12:00-17:00","subject":"MUHASEBE - MALİYE"}],"CUMARTESİ / PAZAR":[{"time":"12:00-17:00","subject":"MATEMATİK - İŞLETME"}]}'::JSONB,
 '{"2025-12-08":7,"2025-12-09":5,"2025-12-10":6,"2025-12-11":7,"2025-12-12":6,"2025-12-13":19,"2025-12-15":7,"2025-12-16":8,"2025-12-17":6,"2025-12-18":9,"2025-12-19":8,"2025-12-20":19,"2025-12-22":9,"2025-12-23":8,"2025-12-24":6,"2025-12-25":7,"2025-12-26":6,"2025-12-27":3,"2025-12-29":5,"2025-12-30":2}'::JSONB,
 '[{"videoId":1,"courseId":"ekonomi_1","timestamp":"2025-12-08T14:50:00.000Z"},{"videoId":2,"courseId":"ekonomi_1","timestamp":"2025-12-08T14:50:00.000Z"},{"videoId":3,"courseId":"ekonomi_1","timestamp":"2025-12-08T14:50:00.000Z"},{"videoId":4,"courseId":"ekonomi_1","timestamp":"2025-12-08T14:50:00.000Z"},{"videoId":1,"courseId":"hukuk_1","timestamp":"2025-12-09T14:35:00.000Z"},{"videoId":2,"courseId":"hukuk_1","timestamp":"2025-12-09T14:35:00.000Z"},{"videoId":3,"courseId":"hukuk_1","timestamp":"2025-12-09T14:35:00.000Z"},{"videoId":1,"courseId":"muhasebe_1","timestamp":"2025-12-10T13:25:00.000Z"},{"videoId":2,"courseId":"muhasebe_1","timestamp":"2025-12-10T13:25:00.000Z"},{"videoId":3,"courseId":"muhasebe_1","timestamp":"2025-12-10T13:25:00.000Z"},{"videoId":4,"courseId":"muhasebe_1","timestamp":"2025-12-10T13:25:00.000Z"},{"videoId":5,"courseId":"ekonomi_1","timestamp":"2025-12-11T14:50:00.000Z"},{"videoId":6,"courseId":"ekonomi_1","timestamp":"2025-12-11T14:50:00.000Z"},{"videoId":7,"courseId":"ekonomi_1","timestamp":"2025-12-11T14:50:00.000Z"},{"videoId":8,"courseId":"ekonomi_1","timestamp":"2025-12-11T14:50:00.000Z"},{"videoId":4,"courseId":"hukuk_1","timestamp":"2025-12-12T14:35:00.000Z"},{"videoId":5,"courseId":"hukuk_1","timestamp":"2025-12-12T14:35:00.000Z"},{"videoId":6,"courseId":"hukuk_1","timestamp":"2025-12-12T14:35:00.000Z"},{"videoId":1,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":2,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":3,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":4,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":5,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":6,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":7,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":8,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":9,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":10,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":11,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":12,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":13,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":14,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":15,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":16,"courseId":"yetenek_1","timestamp":"2025-12-13T14:40:00.000Z"},{"videoId":9,"courseId":"ekonomi_1","timestamp":"2025-12-15T14:50:00.000Z"},{"videoId":10,"courseId":"ekonomi_1","timestamp":"2025-12-15T14:50:00.000Z"},{"videoId":11,"courseId":"ekonomi_1","timestamp":"2025-12-15T14:50:00.000Z"},{"videoId":12,"courseId":"ekonomi_1","timestamp":"2025-12-15T14:50:00.000Z"},{"videoId":7,"courseId":"hukuk_1","timestamp":"2025-12-16T14:35:00.000Z"},{"videoId":8,"courseId":"hukuk_1","timestamp":"2025-12-16T14:35:00.000Z"},{"videoId":9,"courseId":"hukuk_1","timestamp":"2025-12-16T14:35:00.000Z"},{"videoId":10,"courseId":"hukuk_1","timestamp":"2025-12-16T14:35:00.000Z"},{"videoId":5,"courseId":"muhasebe_1","timestamp":"2025-12-17T13:25:00.000Z"},{"videoId":6,"courseId":"muhasebe_1","timestamp":"2025-12-17T13:25:00.000Z"},{"videoId":7,"courseId":"muhasebe_1","timestamp":"2025-12-17T13:25:00.000Z"},{"videoId":8,"courseId":"muhasebe_1","timestamp":"2025-12-17T13:25:00.000Z"},{"videoId":13,"courseId":"ekonomi_1","timestamp":"2025-12-18T14:50:00.000Z"},{"videoId":14,"courseId":"ekonomi_1","timestamp":"2025-12-18T14:50:00.000Z"},{"videoId":15,"courseId":"ekonomi_1","timestamp":"2025-12-18T14:50:00.000Z"},{"videoId":16,"courseId":"ekonomi_1","timestamp":"2025-12-18T14:50:00.000Z"},{"videoId":17,"courseId":"ekonomi_1","timestamp":"2025-12-18T14:50:00.000Z"},{"videoId":11,"courseId":"hukuk_1","timestamp":"2025-12-19T14:35:00.000Z"},{"videoId":12,"courseId":"hukuk_1","timestamp":"2025-12-19T14:35:00.000Z"},{"videoId":13,"courseId":"hukuk_1","timestamp":"2025-12-19T14:35:00.000Z"},{"videoId":14,"courseId":"hukuk_1","timestamp":"2025-12-19T14:35:00.000Z"},{"videoId":17,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":18,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":19,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":20,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":21,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":22,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":23,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":24,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":25,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":26,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":27,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":28,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":29,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":30,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":31,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":32,"courseId":"yetenek_1","timestamp":"2025-12-20T14:40:00.000Z"},{"videoId":18,"courseId":"ekonomi_1","timestamp":"2025-12-22T14:50:00.000Z"},{"videoId":19,"courseId":"ekonomi_1","timestamp":"2025-12-22T14:50:00.000Z"},{"videoId":20,"courseId":"ekonomi_1","timestamp":"2025-12-22T14:50:00.000Z"},{"videoId":21,"courseId":"ekonomi_1","timestamp":"2025-12-22T14:50:00.000Z"},{"videoId":22,"courseId":"ekonomi_1","timestamp":"2025-12-22T14:50:00.000Z"},{"videoId":15,"courseId":"hukuk_1","timestamp":"2025-12-23T14:35:00.000Z"},{"videoId":16,"courseId":"hukuk_1","timestamp":"2025-12-23T14:35:00.000Z"},{"videoId":17,"courseId":"hukuk_1","timestamp":"2025-12-23T14:35:00.000Z"},{"videoId":18,"courseId":"hukuk_1","timestamp":"2025-12-23T14:35:00.000Z"},{"videoId":9,"courseId":"muhasebe_1","timestamp":"2025-12-24T13:25:00.000Z"},{"videoId":10,"courseId":"muhasebe_1","timestamp":"2025-12-24T13:25:00.000Z"},{"videoId":11,"courseId":"muhasebe_1","timestamp":"2025-12-24T13:25:00.000Z"},{"videoId":12,"courseId":"muhasebe_1","timestamp":"2025-12-24T13:25:00.000Z"},{"videoId":23,"courseId":"ekonomi_1","timestamp":"2025-12-25T14:50:00.000Z"},{"videoId":24,"courseId":"ekonomi_1","timestamp":"2025-12-25T14:50:00.000Z"},{"videoId":25,"courseId":"ekonomi_1","timestamp":"2025-12-25T14:50:00.000Z"},{"videoId":26,"courseId":"ekonomi_1","timestamp":"2025-12-25T14:50:00.000Z"},{"videoId":19,"courseId":"hukuk_1","timestamp":"2025-12-26T14:35:00.000Z"},{"videoId":20,"courseId":"hukuk_1","timestamp":"2025-12-26T14:35:00.000Z"},{"videoId":21,"courseId":"hukuk_1","timestamp":"2025-12-26T14:35:00.000Z"},{"videoId":60,"courseId":"yetenek_2","timestamp":"2025-12-27T13:38:42.557Z"},{"videoId":1,"courseId":"yetenek_3","timestamp":"2025-12-28T00:29:05.855Z"},{"videoId":2,"courseId":"yetenek_3","timestamp":"2025-12-28T00:29:16.572Z"},{"videoId":1,"courseId":"yetenek_4","timestamp":"2025-12-28T00:30:37.273Z"},{"videoId":27,"courseId":"ekonomi_1","timestamp":"2025-12-29T00:04:11.158Z"},{"videoId":28,"courseId":"ekonomi_1","timestamp":"2025-12-29T13:36:59.088Z"},{"videoId":22,"courseId":"hukuk_1","timestamp":"2025-12-30T10:19:32.032Z"},{"videoId":1,"courseId":"hukuk_2","timestamp":"2025-12-30T20:09:43.930Z"},{"videoId":13,"courseId":"muhasebe_1","timestamp":"2025-12-31T12:51:21.306Z"},{"videoId":29,"courseId":"ekonomi_1","timestamp":"2026-01-01T01:43:35.649Z"},{"videoId":30,"courseId":"ekonomi_1","timestamp":"2026-01-01T12:25:45.030Z"},{"videoId":31,"courseId":"ekonomi_1","timestamp":"2026-01-01T12:25:45.030Z"},{"videoId":32,"courseId":"ekonomi_1","timestamp":"2026-01-01T12:25:45.030Z"},{"videoId":33,"courseId":"ekonomi_1","timestamp":"2026-01-01T12:25:45.030Z"},{"videoId":23,"courseId":"hukuk_1","timestamp":"2026-01-02T19:56:53.791Z"},{"videoId":1,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.212Z"},{"videoId":2,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":3,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":4,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":5,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":6,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":7,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":8,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":9,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":10,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":11,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":12,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":13,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":14,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":15,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":16,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":17,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":18,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":19,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":20,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":21,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":22,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":23,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":24,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":25,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":26,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":27,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":28,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":29,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":30,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":31,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":32,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":33,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":34,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":35,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":36,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":37,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":38,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":39,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":40,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":41,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":42,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":43,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":44,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":45,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":46,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":47,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":48,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":49,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":50,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":51,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":52,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":53,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":54,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":55,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":56,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":57,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":58,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":59,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":61,"courseId":"yetenek_2","timestamp":"2026-01-03T13:48:45.213Z"},{"videoId":73,"courseId":"yetenek_2","timestamp":"2026-01-03T13:49:29.345Z"},{"videoId":34,"courseId":"ekonomi_1","timestamp":"2026-01-05T13:13:29.761Z"},{"videoId":35,"courseId":"ekonomi_1","timestamp":"2026-01-05T13:13:29.761Z"},{"videoId":36,"courseId":"ekonomi_1","timestamp":"2026-01-05T13:13:29.761Z"},{"videoId":37,"courseId":"ekonomi_1","timestamp":"2026-01-05T13:13:29.761Z"}]'::JSONB
),
('c9550472-da44-4100-8799-5a2daed20cca',
 '{"yetenek_1":[1,2,3,4,5,6,7,8,9,10]}'::JSONB,
 '[]'::JSONB,
 '{}'::JSONB,
 '{}'::JSONB,
 '[]'::JSONB
);

-- =====================================================
-- MIGRATE SESSIONS (with pause splitting)
-- =====================================================

-- Sessions without pauses (simple insert)
INSERT INTO study_sessions (user_id, course_id, session_type, duration_seconds, started_at)
SELECT 
    up.user_id,
    s->>'courseId' as course_id,
    s->>'type' as session_type,
    (s->>'duration')::INTEGER as duration_seconds,
    to_timestamp((s->>'timestamp')::BIGINT / 1000) as started_at
FROM temp_user_progress up,
LATERAL jsonb_array_elements(COALESCE(up.sessions, '[]'::JSONB)) as s
WHERE jsonb_typeof(up.sessions) = 'array'
  AND (s->'pauses' IS NULL OR jsonb_array_length(s->'pauses') = 0)
  AND (s->>'duration')::INTEGER > 0;

-- Sessions with pauses: Split into work segments and pause segments
-- For each session with pauses, we need to create multiple records
DO $$
DECLARE
    rec RECORD;
    pause_rec RECORD;
    session_start BIGINT;
    current_start BIGINT;
    pause_start BIGINT;
    pause_end BIGINT;
    session_duration INTEGER;
    work_before_pause INTEGER;
    pause_duration INTEGER;
    remaining_work INTEGER;
BEGIN
    FOR rec IN 
        SELECT 
            up.user_id,
            s->>'courseId' as course_id,
            (s->>'duration')::INTEGER as duration,
            (s->>'timestamp')::BIGINT as timestamp,
            s->'pauses' as pauses
        FROM temp_user_progress up,
        LATERAL jsonb_array_elements(COALESCE(up.sessions, '[]'::JSONB)) as s
        WHERE jsonb_typeof(up.sessions) = 'array'
          AND s->'pauses' IS NOT NULL 
          AND jsonb_array_length(s->'pauses') > 0
    LOOP
        session_start := rec.timestamp;
        current_start := session_start;
        session_duration := rec.duration;
        
        FOR pause_rec IN SELECT value FROM jsonb_array_elements(rec.pauses) LOOP
            pause_start := (pause_rec.value->>'start')::BIGINT;
            pause_end := (pause_rec.value->>'end')::BIGINT;
            
            -- Work segment before pause
            IF pause_start > current_start THEN
                work_before_pause := (pause_start - current_start) / 1000;
                IF work_before_pause > 0 THEN
                    INSERT INTO study_sessions (user_id, course_id, session_type, duration_seconds, started_at)
                    VALUES (rec.user_id, rec.course_id, 'work', work_before_pause, to_timestamp(current_start / 1000));
                END IF;
            END IF;
            
            -- Pause segment
            pause_duration := (pause_end - pause_start) / 1000;
            IF pause_duration > 0 THEN
                INSERT INTO study_sessions (user_id, course_id, session_type, duration_seconds, started_at)
                VALUES (rec.user_id, rec.course_id, 'pause', pause_duration, to_timestamp(pause_start / 1000));
            END IF;
            
            current_start := pause_end;
        END LOOP;
        
        -- Remaining work after last pause
        -- Calculate total pause time
        remaining_work := session_duration - ((current_start - session_start) / 1000);
        IF remaining_work > 0 THEN
            INSERT INTO study_sessions (user_id, course_id, session_type, duration_seconds, started_at)
            VALUES (rec.user_id, rec.course_id, 'work', remaining_work, to_timestamp(current_start / 1000));
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- MIGRATE VIDEO HISTORY
-- =====================================================

INSERT INTO video_history (user_id, course_id, video_id, watched_at)
SELECT 
    up.user_id,
    vh->>'courseId' as course_id,
    (vh->>'videoId')::INTEGER as video_id,
    (vh->>'timestamp')::TIMESTAMPTZ as watched_at
FROM temp_user_progress up,
LATERAL jsonb_array_elements(COALESCE(up.video_history, '[]'::JSONB)) as vh
WHERE jsonb_typeof(up.video_history) = 'array'
ON CONFLICT (user_id, course_id, video_id) DO NOTHING;

-- =====================================================
-- MIGRATE SCHEDULE
-- =====================================================

INSERT INTO user_schedule (user_id, day_of_week, time_slot, subject)
SELECT 
    up.user_id,
    day_key as day_of_week,
    item->>'time' as time_slot,
    item->>'subject' as subject
FROM temp_user_progress up,
LATERAL jsonb_each(COALESCE(up.schedule, '{}'::JSONB)) as days(day_key, day_items),
LATERAL jsonb_array_elements(day_items) as item
WHERE jsonb_typeof(up.schedule) = 'object'
ON CONFLICT (user_id, day_of_week, time_slot) DO UPDATE SET subject = EXCLUDED.subject;

-- =====================================================
-- MIGRATE ACTIVITY LOG
-- =====================================================

INSERT INTO activity_log (user_id, activity_date, activity_count)
SELECT 
    up.user_id,
    date_key::DATE as activity_date,
    (date_value)::INTEGER as activity_count
FROM temp_user_progress up,
LATERAL jsonb_each_text(COALESCE(up.activity_log, '{}'::JSONB)) as log_entry(date_key, date_value)
WHERE jsonb_typeof(up.activity_log) = 'object'
ON CONFLICT (user_id, activity_date) DO UPDATE SET activity_count = EXCLUDED.activity_count;

-- =====================================================
-- CLEANUP
-- =====================================================

DROP TABLE temp_user_progress;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'study_sessions' as table_name, COUNT(*) as row_count FROM study_sessions
UNION ALL
SELECT 'video_history', COUNT(*) FROM video_history
UNION ALL
SELECT 'user_schedule', COUNT(*) FROM user_schedule
UNION ALL
SELECT 'activity_log', COUNT(*) FROM activity_log;
