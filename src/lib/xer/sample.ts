// Embedded sample XER for a small NJTA-flavored bridge replacement project.
// Intentionally seeded with a mix of healthy and DCMA-failing rows so the
// auditor produces a meaningful demo result.
export const SAMPLE_XER = `%T PROJECT
%F proj_id\tproj_short_name\tplan_start_date\tplan_end_date\tlast_recalc_date
%R 1\tNJTA-MP123-BRIDGE\t2026-04-01 08:00\t2027-09-30 17:00\t2026-05-01 08:00
%T PROJWBS
%F wbs_id\tproj_id\tparent_wbs_id\twbs_short_name\twbs_name\tseq_num
%R 100\t1\t\tNJTA-MP123\tNJTA MP 123 Bridge Replacement\t1
%R 110\t1\t100\tMOB\tMobilization\t1
%R 120\t1\t100\tDEMO\tDemolition\t2
%R 130\t1\t100\tSTRUCT\tStructure\t3
%R 140\t1\t100\tROAD\tRoadway & Paving\t4
%R 150\t1\t100\tCLOSE\tProject Closeout\t5
%T TASK
%F task_id\ttask_code\ttask_name\tproj_id\twbs_id\ttask_type\tstatus_code\ttarget_drtn_hr_cnt\tremain_drtn_hr_cnt\ttotal_float_hr_cnt\tfree_float_hr_cnt\tcstr_type\tcstr_date\ttarget_start_date\ttarget_end_date\tearly_start_date\tearly_end_date\tdriving_path_flag
%R 1001\tM100\tAdvertisement Date\t1\t100\tTT_Mile\tTK_Complete\t0\t0\t0\t0\t\t\t2026-03-01 08:00\t2026-03-01 08:00\t2026-03-01 08:00\t2026-03-01 08:00\tY
%R 1002\tM500\tConstruction Start\t1\t110\tTT_Mile\tTK_Complete\t0\t0\t0\t0\t\t\t2026-04-01 08:00\t2026-04-01 08:00\t2026-04-01 08:00\t2026-04-01 08:00\tY
%R 1003\tA1010\tMobilize Site Office\t1\t110\tTT_Task\tTK_Complete\t80\t0\t0\t0\t\t\t2026-04-01 08:00\t2026-04-10 17:00\t2026-04-01 08:00\t2026-04-10 17:00\tY
%R 1004\tA1020\tInstall Site Fencing & MPT\t1\t110\tTT_Task\tTK_Active\t120\t40\t0\t0\t\t\t2026-04-11 08:00\t2026-04-25 17:00\t2026-04-11 08:00\t2026-04-25 17:00\tY
%R 1005\tA2010\tDemo Existing Bridge Deck\t1\t120\tTT_Task\tTK_NotStart\t400\t400\t0\t0\tCS_MSO\t2026-04-26 08:00\t2026-04-26 08:00\t2026-06-15 17:00\t2026-04-26 08:00\t2026-06-15 17:00\tY
%R 1006\tA2020\tRemove Substructure\t1\t120\tTT_Task\tTK_NotStart\t320\t320\t0\t0\t\t\t2026-06-16 08:00\t2026-08-05 17:00\t2026-06-16 08:00\t2026-08-05 17:00\tY
%R 1007\tA3010\tDrive Piles - Pier 1\t1\t130\tTT_Task\tTK_NotStart\t240\t240\t0\t0\t\t\t2026-08-06 08:00\t2026-09-15 17:00\t2026-08-06 08:00\t2026-09-15 17:00\tY
%R 1008\tA3020\tForm & Pour Pier 1\t1\t130\tTT_Task\tTK_NotStart\t720\t720\t0\t0\t\t\t2026-09-16 08:00\t2027-01-12 17:00\t2026-09-16 08:00\t2027-01-12 17:00\tY
%R 1009\tA3030\tErect Steel Girders\t1\t130\tTT_Task\tTK_NotStart\t360\t360\t40\t40\t\t\t2027-01-13 08:00\t2027-03-15 17:00\t2027-01-13 08:00\t2027-03-15 17:00\t
%R 1010\tA3040\tDeck Forming & Pour\t1\t130\tTT_Task\tTK_NotStart\t480\t480\t40\t40\t\t\t2027-03-16 08:00\t2027-05-25 17:00\t2027-03-16 08:00\t2027-05-25 17:00\t
%R 1011\tA4010\tApproach Roadway Subbase\t1\t140\tTT_Task\tTK_NotStart\t200\t200\t160\t160\t\t\t2027-05-26 08:00\t2027-06-25 17:00\t2027-05-26 08:00\t2027-06-25 17:00\t
%R 1012\tA4020\tPlace HMA Surface Course\t1\t140\tTT_Task\tTK_NotStart\t160\t160\t0\t0\t\t\t2027-06-26 08:00\t2027-07-20 17:00\t2027-06-26 08:00\t2027-07-20 17:00\t
%R 1013\tA4030\tStriping & Signage\t1\t140\tTT_Task\tTK_NotStart\t80\t80\t0\t0\t\t\t2027-07-21 08:00\t2027-08-05 17:00\t2027-07-21 08:00\t2027-08-05 17:00\t
%R 1014\tA5010\tFinal Punch List\t1\t150\tTT_Task\tTK_NotStart\t120\t120\t0\t0\t\t\t2027-08-06 08:00\t2027-08-25 17:00\t2027-08-06 08:00\t2027-08-25 17:00\t
%R 1015\tA5020\tDangling Activity - Closeout Docs\t1\t150\tTT_Task\tTK_NotStart\t80\t80\t0\t0\t\t\t2027-08-26 08:00\t2027-09-10 17:00\t2027-08-26 08:00\t2027-09-10 17:00\t
%R 1016\tM950\tProject Completion\t1\t150\tTT_Mile\tTK_NotStart\t0\t0\t0\t0\tCS_MFO\t2027-09-30 17:00\t2027-09-30 17:00\t2027-09-30 17:00\t2027-09-30 17:00\t2027-09-30 17:00\tY
%T TASKPRED
%F task_pred_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt
%R 5001\t1003\t1002\tPR_FS\t0
%R 5002\t1004\t1003\tPR_FS\t0
%R 5003\t1005\t1004\tPR_FS\t0
%R 5004\t1006\t1005\tPR_FS\t0
%R 5005\t1007\t1006\tPR_FS\t0
%R 5006\t1008\t1007\tPR_FS\t0
%R 5007\t1009\t1008\tPR_FS\t-40
%R 5008\t1010\t1009\tPR_FS\t0
%R 5009\t1011\t1010\tPR_FS\t0
%R 5010\t1012\t1011\tPR_FS\t80
%R 5011\t1013\t1012\tPR_FS\t0
%R 5012\t1014\t1013\tPR_FS\t0
%R 5013\t1016\t1014\tPR_FS\t0
%E
`;
