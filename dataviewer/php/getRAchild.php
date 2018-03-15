<?php
//Check $_POST and process request
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	require_once '../../common/php/common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
		require_once '../../common/php/login.php';
		
    function makeRoomInfoQuery($conn, $queryStr, $bindArray) {
    	$stid = odbc_prepare($conn, $queryStr);
    	odbc_execute($stid, $bindArray);
    	$returnvar = processQuery($stid); //Populate return array
    	odbc_free_result($stid);
    	return $returnvar;
    }

  	//Define return array
  	$arr = array(
  		'request' => array(),
  		'results' => array() );

  	//Populate request array
  	$postArr = json_decode($_POST["json"], true);
  	$arr['request'] = $postArr['q'];
  	//Connection session variable
  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	//Request variables
  	$getRoom = $postArr['getRoom'];
  	$facCode = $arr['request']['FACILITY_CODE'];
  	$roomNum = $arr['request']['ROOM_NUMBER'];
  	$raOrg = $arr['request']['ORGANIZATION'];
  	$raEmp = $arr['request']['EMPLOYEE_ID'];
  	//$bindArray_room = array(":faccode_bv" => $facCode, ":roomnum_bv" => $roomNum);
  	//$bindArray_raChild = array(":faccode_bv" => $facCode, ":roomnum_bv" => $roomNum, ":raorg_bv" => $raOrg, ":raemp_bv" => $raEmp);
		$bindArray_room = array($facCode, $roomNum);
  	$bindArray_raChild = array($facCode, $roomNum, $raOrg, $raEmp);

  	if ($getRoom) {
    	//Room query string
    	$queryStr = "SELECT R.FACILITY_CODE,R.FLOOR_CODE,R.ROOM_NUMBER,R.SQUARE_FEET,R.ROOM_TYPE,R.ORGANIZATION,R.CAPACITY,R.CONFIRM_DATE,R.CONFIRM_USER, "
    						//. "(SELECT F.FACILITY_NUMBER FROM " . $tableFacility . " F WHERE R.FACILITY_CODE = F.FACILITY_CODE) AS FACILITY_NUMBER, "
								. "R.FACILITY_NUMBER, "
    						. "(SELECT F.FACILITY_CODE + ' - ' + F.LONG_NAME + ' - ' + CAST(F.FACILITY_NUMBER as nvarchar) FROM " . $tableFacility . " F WHERE R.FACILITY_CODE = F.FACILITY_CODE) AS FACDESC, "
    						. "(SELECT O.OrgName FROM " . $tableOrg . " O WHERE R.ORGANIZATION = O.OrgCode) AS ORG_NAME "
    						. "FROM " . $tableRoom . " R "
    						. "WHERE R.FACILITY_CODE = ? AND R.ROOM_NUMBER = ?";
    	$arr['results']['room'] = makeRoomInfoQuery($conn, $queryStr, $bindArray_room);	//Make query and populate results array
  	}
  	
  	//Room Assignment Use query string
  	$queryStr = 'SELECT FACILITY_CODE, ROOM_NUMBER, ORGANIZATION, EMPLOYEE_ID, FUNCTIONAL_USE_CODE, FUNCTIONAL_USE_PERCENT '
  						. 'FROM ' . $tableRoomAssignmentUse . ' '
  						. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ORGANIZATION = ? AND EMPLOYEE_ID = ? '
  						. 'ORDER BY FUNCTIONAL_USE_PERCENT DESC';
  	$arr['results']['roomAssignmentUse'] = makeRoomInfoQuery($conn, $queryStr, $bindArray_raChild);	//Make query and populate results array
  	
  	//Room Assignment Occupant query string
  	$queryStr = 'SELECT RAO.FACILITY_CODE, RAO.ROOM_NUMBER, RAO.ORGANIZATION, RAO.EMPLOYEE_ID, RAO.OCCUPANT_EID, '
  						. '(SELECT RTRIM(E.DisplayName) FROM ' . $tableEmployee . ' E WHERE RAO.OCCUPANT_EID = E.EmployeeID) AS EMPLOYEE_NAME '
  						. 'FROM ' . $tableRoomAssignmentOccupant . ' RAO '
  						. 'WHERE RAO.FACILITY_CODE = ? AND RAO.ROOM_NUMBER = ? AND RAO.ORGANIZATION = ? AND RAO.EMPLOYEE_ID = ? '
  						. 'ORDER BY EMPLOYEE_NAME';
  	$arr['results']['roomAssignmentOcc'] = makeRoomInfoQuery($conn, $queryStr, $bindArray_raChild);	//Make query and populate results array

  	//Budget query string
  	$queryStr = 'SELECT RVG.FACILITY_CODE, RVG.ROOM_NUMBER, RVG.ORGANIZATION, RVG.EMPLOYEE_ID, RVG.BUDGET_NUMBER, RVG.FISCAL_YEAR_ENTERED, RVG.PRIMARY_ROOM, '
  						. '(SELECT RTRIM(B.BudgetName) FROM ' . $tableBudget . ' B WHERE B.BudgetNbr = RVG.BUDGET_NUMBER) AS BUDGET_NAME ' //NEED TO ADD FISCAL YEAR CONSTRAINT ONCE IT IS IN CURRENT_GRANTS
  						. 'FROM ' . $tableRoomsVsGrants . ' RVG '
  						. 'WHERE RVG.FACILITY_CODE = ? AND RVG.ROOM_NUMBER = ? AND RVG.ORGANIZATION = ? AND RVG.EMPLOYEE_ID = ? '
  						. 'ORDER BY BUDGET_NUMBER';
  	$arr['results']['budget'] = makeRoomInfoQuery($conn, $queryStr, $bindArray_raChild);	//Make query and populate results array
  	
  	//Close connection
  	odbc_close($conn);

  	//echo return array as json string
  	echo json_encode($arr);
	} else {
		$arr['results']['msg'] = array(
  		'text' => 'Not authorized.',
  		'type' => 'failure');
  	echo json_encode($arr['results']);
  }
}
