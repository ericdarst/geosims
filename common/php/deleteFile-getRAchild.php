<?php
/**
require_once '../../common/php/login.php';
require_once '../../common/php/common.php';

//Check $_POST and process request
if ((!empty($_POST["json"])) && (isset($_SERVER['REMOTE_USER']))) {

  function makeRoomInfoQuery($conn, $queryStr, $bindArray) {
  	//Write query
  	$stid = oci_parse($conn, $queryStr);
  		
  	//Bind params to query
  	foreach ($bindArray as $key => $value) {
  		oci_bind_by_name($stid, $key, $bindArray[$key], -1);
  	}
  		
  	//Execute query
  	oci_execute($stid);

  	//Populate return array
  	$returnvar = processQuery($stid);
  	oci_free_statement($stid);
  	return $returnvar;
  }

	//Define return array
	$arr = array(
		'request' => array(),
		'results' => array() );

	//Populate request array
	$arr['request'] = json_decode($_POST["json"], true);
	
	//Connection session variable
	$conn = createConn($db_username,$db_password,$db_hostname);  //Connection property variables defined in login.php
	
	//Request variables
	$facCode = $arr['request']['FACILITY_CODE'];
	$roomNum = $arr['request']['ROOM_NUMBER'];
	$raOrg = $arr['request']['ORGANIZATION'];
	$raEmp = $arr['request']['EMPLOYEE_ID'];
	$bindArray = array(":faccode_bv" => $facCode, ":roomnum_bv" => $roomNum, ":raorg_bv" => $raOrg, ":raemp_bv" => $raEmp);

	//Room Assignment Use query string
	$queryStr = 'SELECT FACILITY_CODE, ROOM_NUMBER, ORGANIZATION, EMPLOYEE_ID, FUNCTIONAL_USE_CODE, FUNCTIONAL_USE_PERCENT '
						. 'FROM ' . $tableRoomAssignmentUse . ' '
						. 'WHERE FACILITY_CODE = :faccode_bv AND ROOM_NUMBER = :roomnum_bv AND ORGANIZATION = :raorg_bv AND EMPLOYEE_ID = :raemp_bv';
	$arr['results']['roomAssignmentUse'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array
	
	//Room Assignment Occupant query string
	$queryStr = 'SELECT RAO.FACILITY_CODE, RAO.ROOM_NUMBER, RAO.ORGANIZATION, RAO.EMPLOYEE_ID, RAO.OCCUPANT_EID, '
						. '(SELECT E.EMPLOYEE_NAME FROM ' . $tableEmployee . ' E WHERE RAO.OCCUPANT_EID = E.EMPLOYEE_ID) AS EMPLOYEE_NAME '
						. 'FROM ' . $tableRoomAssignmentOccupant . ' RAO '
						. 'WHERE RAO.FACILITY_CODE = :faccode_bv AND RAO.ROOM_NUMBER = :roomnum_bv AND RAO.ORGANIZATION = :raorg_bv AND RAO.EMPLOYEE_ID = :raemp_bv';
	$arr['results']['roomAssignmentOcc'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array

	//Budget query string
	$queryStr = 'SELECT RVG.FACILITY_CODE, RVG.ROOM_NUMBER, RVG.ORGANIZATION, RVG.EMPLOYEE_ID, RVG.BUDGET_NUMBER, RVG.FISCAL_YEAR_ENTERED, RVG.PRIMARY_ROOM, '
						. '(SELECT B.BUDGET_NAME FROM ' . $tableBudget . ' B WHERE B.BUDGET_NUMBER = RVG.BUDGET_NUMBER) AS BUDGET_NAME ' //NEED TO ADD FISCAL YEAR CONSTRAINT ONCE IT IS IN CURRENT_GRANTS
						. 'FROM ' . $tableRoomsVsGrants . ' RVG '
						. 'WHERE RVG.FACILITY_CODE = :faccode_bv AND RVG.ROOM_NUMBER = :roomnum_bv AND RVG.ORGANIZATION = :raorg_bv AND RVG.EMPLOYEE_ID = :raemp_bv';
	$arr['results']['budget'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array
	
	//Close connection
	oci_close($conn);

	//echo return array as json string
	echo json_encode($arr);
**/
}
