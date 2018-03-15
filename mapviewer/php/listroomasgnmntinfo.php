<?php
require_once '../../common/php/login.php';
require_once '../../common/php/common.php';

//Check $_POST and process request
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
    function makeRoomInfoQuery($conn, $queryStr, $bindArray) {
    	//Write query
    	$stid = odbc_prepare($conn, $queryStr);
    		
    	//Bind params to query
			$paramVals = array();
    	foreach ($bindArray as $key => $value) {
    		//oci_bind_by_name($stid, $key, $bindArray[$key], -1);
				$paramVals[] = $bindArray[$key];
    	}
    		
    	//Execute query
    	odbc_execute($stid, $paramVals);

    	//Populate return array
    	$returnvar = processQuery($stid);
    	odbc_free_result($stid);
    	return $returnvar;
    }

  	//Define return array
  	$arr = array(
  		'request' => array(),
  		'results' => array() );

  	//Populate request array
  	$arr['request'] = json_decode($_POST["json"], true);
  	
  	//Connection session variable
  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	//Request variables
  	$facCode = $arr['request']['FACILITY_CODE'];
  	$roomNum = $arr['request']['ROOM_NUMBER'];
  	$raOrg = $arr['request']['ORGANIZATION'];
  	$raEmp = $arr['request']['EMPLOYEE_ID'];
  	$bindArray = array(":faccode_bv" => $facCode, ":roomnum_bv" => $roomNum, ":raorg_bv" => $raOrg, ":raemp_bv" => $raEmp);

  	//Room Assignment Use query string
  	$queryStr = 'SELECT FACILITY_CODE, ROOM_NUMBER, ORGANIZATION, EMPLOYEE_ID, FUNCTIONAL_USE_CODE, FUNCTIONAL_USE_PERCENT '
  						. 'FROM ' . $tableRoomAssignmentUse . ' '
  						. 'WHERE FACILITY_CODE = ? AND ROOM_NUMBER = ? AND ORGANIZATION = ? AND EMPLOYEE_ID = ? '
  						. 'ORDER BY FUNCTIONAL_USE_PERCENT DESC';
  	$arr['results']['use'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array
  	
  	//Room Assignment Occupant query string
  	$queryStr = 'SELECT RAO.FACILITY_CODE, RAO.ROOM_NUMBER, RAO.ORGANIZATION, RAO.EMPLOYEE_ID, RAO.OCCUPANT_EID, '
  						. '(SELECT E.DisplayName FROM ' . $tableEmployee . ' E WHERE RAO.OCCUPANT_EID = E.EmployeeID) AS EMPLOYEE_NAME '
  						. 'FROM ' . $tableRoomAssignmentOccupant . ' RAO '
  						. 'WHERE RAO.FACILITY_CODE = ? AND RAO.ROOM_NUMBER = ? AND RAO.ORGANIZATION = ? AND RAO.EMPLOYEE_ID = ? '
  						. 'ORDER BY EMPLOYEE_NAME';
  	$arr['results']['occupant'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array

  	//Budget query string
  	$queryStr = 'SELECT RVG.FACILITY_CODE, RVG.ROOM_NUMBER, RVG.ORGANIZATION, RVG.EMPLOYEE_ID, RVG.BUDGET_NUMBER, RVG.FISCAL_YEAR_ENTERED, RVG.PRIMARY_ROOM, '
  						. '(SELECT B.BudgetName FROM ' . $tableBudget . ' B WHERE B.BudgetNbr = RVG.BUDGET_NUMBER) AS BUDGET_NAME ' //NEED TO ADD FISCAL YEAR CONSTRAINT ONCE IT IS IN CURRENT_GRANTS
  						. 'FROM ' . $tableRoomsVsGrants . ' RVG '
  						. 'WHERE RVG.FACILITY_CODE = ? AND RVG.ROOM_NUMBER = ? AND RVG.ORGANIZATION = ? AND RVG.EMPLOYEE_ID = ? '
  						. 'ORDER BY BUDGET_NUMBER';
  	$arr['results']['budget'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array
  	
  	//Close connection
  	odbc_close($conn);

  	//echo return array as json string
  	echo json_encode($arr);
  } else {
  	//Not authorized
  	$arr['results']['msg'] = array(
  		'text' => 'Not authorized.',
  		'type' => 'failure');
  	echo json_encode($arr['results']);
  }
}
