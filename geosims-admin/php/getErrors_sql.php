<?php
$getErrors_sql = array(
	'facErrors' => "select facility_code, facility_code + ' - ' + long_name + ' - ' + cast(facility_number as varchar) as FACDESC, 'FACILITY_TABLE' as TBL, 'CRITICAL' as SEVERITY, 'INVALID FACILITY_TYPE' as ERROR_TYPE, 'FACILITY_TYPE (value: ' + facility_type + ') is not valid' as ERROR from " . $tableFacility
    . " where facility_type not in (select facility_type from facility_type)
		union 
		select facility_code, facility_code + ' - ' + long_name + ' - ' + cast(facility_number as varchar) as FACDESC, 'FACILITY_TABLE' as TBL, 'CRITICAL' as SEVERITY, 'INVALID STATUS' as ERROR_TYPE, 'STATUS (value: ' + status + ') is not valid' as ERROR from " . $tableFacility
    . " where status not in (select status from status) 
		union 
		select facility_code, facility_code + ' - ' + long_name + ' - ' + cast(facility_number as varchar) as FACDESC, 'FACILITY_TABLE' as TBL, 'CRITICAL' as SEVERITY, 'INVALID SITE' as ERROR_TYPE, 'SITE (value: ' + site + ') is not valid' as ERROR from " . $tableFacility
    . " where site not in (select site from site)
		union
		select facility_code, facility_code + ' - ' + long_name + ' - ' + cast(facility_number as varchar) as FACDESC, 'FACILITY_ADDRESS' as TBL, 'CRITICAL' as SEVERITY, 'NO ADDRESS' as ERROR_TYPE, 'Address does not exist' as ERROR from " . $tableFacility
    . " where facility_type in ('BLDG','EQPL') and status not in ('DOC') and facility_number not in (select facility_number from facility_address) 
		union 
		select facility_code, facility_code + ' - ' + long_name + ' - ' + cast(facility_number as varchar) as FACDESC, 'FACILITY_TABLE' as TBL, 'CRITICAL' as SEVERITY, 'NULL FIELD' as ERROR_TYPE, 'A required field is null' as ERROR from " . $tableFacility
    . " where facility_number is null or facility_code is null or facility_type is null or status is null or name is null or long_name is null or site is null",
    
  'facStatus' => "select facility_number, facility_code + ' - ' + long_name + ' - ' + cast(facility_number as varchar) as FACDESC, f.status + ' - ' + s.status_description as STATUSDESC
		from facility_table f
		left join status s on f.status = s.status
		where f.status in ('DP','UC','UR','INF')
		order by f.status, facility_code",
    
  /**'blgChangesByTable' => "select x.*, ROOM_CHANGES + ROOM_ASSIGNMENT_CHANGES + RA_USE_CHANGES + RA_OCCUPANT_CHANGES + ROOMS_VS_GRANTS_CHANGES as TOTAL_CHANGES from (select 1 as display_order, 'Today' as timeframe,"
    . " (select count(*) as changes from ROOM_HIST where MOD_USER = 'SIMSWEB' and to_char(MOD_DATE,'YYYYMMDD') = to_char(SYSDATE,'YYYYMMDD')) as ROOM_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_HIST where MOD_USER = 'SIMSWEB' and to_char(MOD_DATE,'YYYYMMDD') = to_char(SYSDATE,'YYYYMMDD')) as ROOM_ASSIGNMENT_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_USE_HIST where MOD_USER = 'SIMSWEB' and to_char(MOD_DATE,'YYYYMMDD') = to_char(SYSDATE,'YYYYMMDD')) as RA_USE_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_OCCUPANT_HIST where MOD_USER = 'SIMSWEB' and to_char(MOD_DATE,'YYYYMMDD') = to_char(SYSDATE,'YYYYMMDD')) as RA_OCCUPANT_CHANGES,"
    . " (select count(*) as changes from ROOMS_VS_GRANTS_HIST where MOD_USER = 'SIMSWEB' and to_char(MOD_DATE,'YYYYMMDD') = to_char(SYSDATE,'YYYYMMDD')) as ROOMS_VS_GRANTS_CHANGES"
    . " from dual"
    . " UNION"
    . " select 2 as display_order, 'Last 3 Days' as timeframe,"
    . " (select count(*) as changes from ROOM_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 3) as ROOM_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 3) as ROOM_ASSIGNMENT_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_USE_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 3) as RA_USE_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_OCCUPANT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 3) as RA_OCCUPANT_CHANGES,"
    . " (select count(*) as changes from ROOMS_VS_GRANTS_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 3) as ROOMS_VS_GRANTS_CHANGES"
    . " from dual"
    . " UNION"
    . " select 3 as display_order, 'Last 7 Days' as timeframe,"
    . " (select count(*) as changes from ROOM_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 7) as ROOM_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 7) as ROOM_ASSIGNMENT_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_USE_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 7) as RA_USE_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_OCCUPANT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 7) as RA_OCCUPANT_CHANGES,"
    . " (select count(*) as changes from ROOMS_VS_GRANTS_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 7) as ROOMS_VS_GRANTS_CHANGES"
    . " from dual"
    . " UNION"
    . " select 4 as display_order, 'Last 30 Days' as timeframe,"
    . " (select count(*) as changes from ROOM_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 30) as ROOM_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 30) as ROOM_ASSIGNMENT_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_USE_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 30) as RA_USE_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_OCCUPANT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 30) as RA_OCCUPANT_CHANGES,"
    . " (select count(*) as changes from ROOMS_VS_GRANTS_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 30) as ROOMS_VS_GRANTS_CHANGES"
    . " from dual"
    . " UNION"
    . " select 5 as display_order, 'Year To Date ' + to_char(SYSDATE,'YYYY') as timeframe,"
    . " (select count(*) as changes from ROOM_HIST where MOD_USER = 'SIMSWEB' and to_char(SYSDATE,'YYYY') = to_char(MOD_DATE,'YYYY')) as ROOM_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_HIST where MOD_USER = 'SIMSWEB' and to_char(SYSDATE,'YYYY') = to_char(MOD_DATE,'YYYY')) as ROOM_ASSIGNMENT_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_USE_HIST where MOD_USER = 'SIMSWEB' and to_char(SYSDATE,'YYYY') = to_char(MOD_DATE,'YYYY')) as RA_USE_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_OCCUPANT_HIST where MOD_USER = 'SIMSWEB' and to_char(SYSDATE,'YYYY') = to_char(MOD_DATE,'YYYY')) as RA_OCCUPANT_CHANGES,"
    . " (select count(*) as changes from ROOMS_VS_GRANTS_HIST where MOD_USER = 'SIMSWEB' and to_char(SYSDATE,'YYYY') = to_char(MOD_DATE,'YYYY')) as ROOMS_VS_GRANTS_CHANGES"
    . " from dual"
    . " UNION"
    . " select 6 as display_order, 'Last 365 Days' as timeframe,"
    . " (select count(*) as changes from ROOM_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 365) as ROOM_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 365) as ROOM_ASSIGNMENT_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_USE_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 365) as RA_USE_CHANGES,"
    . " (select count(*) as changes from ROOM_ASSIGNMENT_OCCUPANT_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 365) as RA_OCCUPANT_CHANGES,"
    . " (select count(*) as changes from ROOMS_VS_GRANTS_HIST where MOD_USER = 'SIMSWEB' and SYSDATE - MOD_DATE <= 365) as ROOMS_VS_GRANTS_CHANGES"
    . " from dual"
    . " ) x",**/
		
	'roomErrors' => "select facility_code, room_number, 'ROOM' as TBL, 'ERROR' as SEVERITY, 'NULL FIELD' as ERROR_TYPE, 'A required field is null' as ERROR
	from room
	where (facility_code is null or floor_code is null or room_number is null or square_feet is null or room_type is null or organization is null)
	union
	select facility_code, room_number, 'ROOM' as TBL, 'CRITICAL' as SEVERITY, 'INVALID FACILITY_CODE' as ERROR_TYPE, 'FACILITY_CODE (value: ' + facility_code + ') is not valid' as ERROR
	from room
	where facility_code not in (select facility_code from facility_table)
	union
	select facility_code, room_number, 'ROOM' as TBL, 'CRITICAL' as SEVERITY, 'INVALID FLOOR_CODE' as ERROR_TYPE, 'FLOOR_CODE (value: ' + floor_code + ') is not valid' as ERROR
	from room x
	where not exists (select * from floor_code y where x.FACILITY_CODE = y.FACILITY_CODE and x.FLOOR_CODE = y.FLOOR_CODE) and floor_plan = 'T'
	union
	select facility_code, room_number, 'ROOM' as TBL, 'CRITICAL' as SEVERITY, 'INVALID ROOM_TYPE' as ERROR_TYPE, 'ROOM_TYPE (value: ' + room_type + ') is not valid' as ERROR
	from room
	where room_type not in (select room_type from room_type)
	union
	select facility_code, room_number, 'ROOM' as TBL, 'CRITICAL' as SEVERITY, 'FACROOM MISMATCH' as ERROR_TYPE, 'Facroom field does not match facility number, floor, and room number.' as ERROR
	from room
	where cast(facility_number as varchar) + '_' + floor_code + '_' + room_number <> facroom
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_USE' as TBL, 'CRITICAL' as SEVERITY, 'INVALID FUNCTIONAL_USE_CODE' as ERROR_TYPE, 'FUNCTIONAL_USE_CODE (value: ' + functional_use_code + ') is not valid' as ERROR
	from room_assignment_use
	where functional_use_code not in (select functional_use_code from functional_use_code)
	union
	select facility_code, room_number, 'ROOM' as TBL, 'CRITICAL' as SEVERITY, 'ORGANIZATION LENGTH' as ERROR_TYPE, 'ORGANIZATION (value: ' + organization + ') is not valid' as ERROR
	from room
	where organization not in (select OrgCode from FINANCIALORGANIZATIONCURRENTBIENNIUM where BienniumEndPurgeInd <> '1' or BienniumEndPurgeInd is null)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT' as TBL, 'CRITICAL' as SEVERITY, 'INVALID ASSIGNEE_ORGANIZATION' as ERROR_TYPE, 'ASSIGNEE_ORGANIZATION (value: ' + assignee_organization + ') is not valid' as ERROR
	from room_assignment
	where assignee_organization not in (select OrgCode from FINANCIALORGANIZATIONCURRENTBIENNIUM where BienniumEndPurgeInd <> '1' or BienniumEndPurgeInd is null)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT' as TBL, 'CRITICAL' as SEVERITY, 'ASSIGNEE_EMPLOYEE_ID LENGTH' as ERROR_TYPE, 'ASSIGNEE_EMPLOYEE_ID (value: ' + assignee_employee_id + ', length: ' + cast(len(assignee_employee_id) as varchar) + ') has length less than 9 in ROOM_ASSIGNMENT' as ERROR
	from room_assignment
	where len(assignee_employee_id) <> 9
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_OCCUPANT' as TBL, 'CRITICAL' as SEVERITY, 'OCCUPANT_EID LENGTH' as ERROR_TYPE, 'OCCUPANT_EID (value: ' + occupant_eid + ', length: ' + cast(len(occupant_eid) as varchar) + ') has length less than 9 in ROOM_ASSIGNMENT_OCCUPANT' as ERROR
	from room_assignment_occupant
	where len(occupant_eid) <> 9
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_OCCUPANT' as TBL, 'CRITICAL' as SEVERITY, 'OCCUPANT_EID NOT NUMERIC' as ERROR_TYPE, 'OCCUPANT_EID (value: ' + occupant_eid + ') is not numeric in ROOM_ASSIGNMENT_OCCUPANT' as ERROR
	from room_assignment_occupant
	where isnumeric(occupant_eid) = 0
	union
	select x.facility_code, x.room_number, 'ROOM_ASSIGNMENT_USE' as TBL, 'CRITICAL' as SEVERITY, 'DUPLICATE ROOM_ASSIGNMENT_USE_CODE' as ERROR_TYPE, 'Duplicate ROOM_ASSIGNMENT_USE record detected (' + x.organization + ',' + x.employee_id + ',' + x.functional_use_code + ')' as ERROR
	from room_assignment_use x
	inner join (select facility_code, room_number, organization, employee_id, functional_use_code from room_assignment_use group by facility_code, room_number, organization, employee_id, functional_use_code having count(*) > 1) y on x.facility_code = y.facility_code and x.room_number = y.room_number and x.ORGANIZATION = y.ORGANIZATION and x.EMPLOYEE_ID = y.EMPLOYEE_ID
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT' as TBL, 'ERROR' as SEVERITY, 'ROOM DOES NOT EXIST' as ERROR_TYPE, 'ROOM_ASSIGNMENT record key not in ROOM (' + assignee_organization + ',' + assignee_employee_id + ')' as ERROR
	from room_assignment x
	where not exists (select * from room y where x.FACILITY_CODE = y.FACILITY_CODE and x.ROOM_NUMBER = y.ROOM_NUMBER)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_USE' as TBL, 'ERROR' as SEVERITY, 'ROOM DOES NOT EXIST' as ERROR_TYPE, 'ROOM_ASSIGNMENT_USE record key not in ROOM (' + organization + ',' + employee_id + ',' + functional_use_code + ')' as ERROR
	from room_assignment_use x
	where not exists (select * from room y where x.FACILITY_CODE = y.FACILITY_CODE and x.ROOM_NUMBER = y.ROOM_NUMBER)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_USE' as TBL, 'ERROR' as SEVERITY, 'ROOM ASSIGNMENT DOES NOT EXIST' as ERROR_TYPE, 'ROOM_ASSIGNMENT_USE record key not in ROOM_ASSIGNMENT (' + organization + ',' + employee_id + ',' + functional_use_code + ')' as ERROR
	from room_assignment_use x
	where not exists (select * from room_assignment y where x.FACILITY_CODE = y.FACILITY_CODE and x.ROOM_NUMBER = y.ROOM_NUMBER and x.ORGANIZATION = y.ASSIGNEE_ORGANIZATION and x.EMPLOYEE_ID = y.ASSIGNEE_EMPLOYEE_ID)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_OCCUPANT' as TBL, 'ERROR' as SEVERITY, 'ROOM DOES NOT EXIST' as ERROR_TYPE, 'ROOM_ASSIGNMENT_OCCUPANT record key not in ROOM (' + organization + ',' + employee_id + ',' + occupant_eid + ')' as ERROR
	from room_assignment_occupant x
	where not exists (select * from room y where x.FACILITY_CODE = y.FACILITY_CODE and x.ROOM_NUMBER = y.ROOM_NUMBER)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_OCCUPANT' as TBL, 'ERROR' as SEVERITY, 'ROOM ASSIGNMENT DOES NOT EXIST' as ERROR_TYPE, 'ROOM_ASSIGNMENT_OCCUPANT record key not in ROOM_ASSIGNMENT (' + organization + ',' + employee_id + ',' + occupant_eid + ')' as ERROR
	from room_assignment_occupant x
	where not exists (select * from room_assignment y where x.FACILITY_CODE = y.FACILITY_CODE and x.ROOM_NUMBER = y.ROOM_NUMBER and x.ORGANIZATION = y.ASSIGNEE_ORGANIZATION and x.EMPLOYEE_ID = y.ASSIGNEE_EMPLOYEE_ID)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT' as TBL, 'WARNING' as SEVERITY, 'INVALID PERCENT TOTAL' as ERROR_TYPE, 'Room total of ASSIGNEE_ROOM_PERCENT (total: ' + cast(sum_assignee_room_percent as varchar) + ') is not 99 or 100' as ERROR
	from (select facility_code, room_number, sum(assignee_room_percent) as sum_assignee_room_percent from room_assignment where assignee_room_percent is not null group by facility_code, room_number) x
	where x.sum_assignee_room_percent not in (99, 100)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT_USE' as TBL, 'WARNING' as SEVERITY, 'INVALID PERCENT TOTAL' as ERROR_TYPE, 'Room assignment (' + organization + ',' + employee_id + ') total of FUNCTIONAL_USE_PERCENT (total: ' + cast(sum_functional_use_percent as varchar) + ') is not 99 or 100' as ERROR
	from (select facility_code, room_number, organization, employee_id, sum(functional_use_percent) as sum_functional_use_percent from room_assignment_use where functional_use_percent is not null group by facility_code, room_number, organization, employee_id) x
	where x.sum_functional_use_percent not in (99, 100)
	union
	select facility_code, room_number, 'ROOM_ASSIGNMENT' as TBL, 'CRITICAL' as SEVERITY, 'ROOM HAS NO ROOM ASSIGNMENT' as ERROR_TYPE, 'ROOM_ASSIGNMENT record not in ROOM_ASSIGNMENT (' + facility_code + ',' + room_number + ')' as ERROR
	from room x
	where not exists (select * from room_assignment y where x.FACILITY_CODE = y.FACILITY_CODE and x.ROOM_NUMBER = y.ROOM_NUMBER)
	union
	select facility_code, room_number, 'ROOM' as TBL, 'CRITICAL' as SEVERITY, 'ROOM NOT IN GIS' as ERROR_TYPE, 'ROOM record not in INTERIORSPACE (' + facility_code + ',' + room_number + ')' as ERROR
	from room x
	where floor_plan <> 'F' and not exists (select * from INTERIORSPACE y where x.FACROOM = y.SPACEID)
	union
	select f.facility_code, roomnumber, 'ROOM' as TBL, 'CRITICAL' as SEVERITY, 'GIS ROOM NOT IN ROOM' as ERROR_TYPE, 'INTERIORSPACE record not in ROOM (' + f.facility_code + ',' + roomnumber + ')' as ERROR
	from INTERIORSPACE x
	left join facility_table f on f.facility_number = x.BUILDINGID
	where f.status not in ('DEM','LT') and not exists (select * from room y where x.SPACEID = y.FACROOM)
	"
);
