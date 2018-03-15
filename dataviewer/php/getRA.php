<?php
//Check $_POST and process request
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	require_once '../../common/php/common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
		require_once '../../common/php/login.php';
		
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
  	//$bindArray = array(":faccode_bv" => $facCode, ":roomnum_bv" => $roomNum);
		$bindArray = array($facCode, $roomNum);

  	//Room Assignment query string
  	$queryStr = "SELECT RA.FACILITY_CODE, RA.ROOM_NUMBER, RA.ASSIGNEE_ORGANIZATION, O.OrgName as ORG_NAME, RA.ASSIGNEE_EMPLOYEE_ID, RTRIM(E.DisplayName) AS EMPLOYEE_NAME, RA.ASSIGNEE_ROOM_PERCENT, RA.DEPT_NOTE, "
  						//. "(SELECT F.FACILITY_NUMBER FROM " . $tableFacility . " F WHERE RA.FACILITY_CODE = F.FACILITY_CODE) AS FACILITY_NUMBER "
							. "RA.FACILITY_NUMBER "
  						. 'FROM ' . $tableRoomAssignment . ' RA '
  						. 'LEFT JOIN ' . $tableOrg . ' O ON RA.ASSIGNEE_ORGANIZATION = O.OrgCode '
  						. 'LEFT JOIN ' . $tableEmployee . ' E ON RA.ASSIGNEE_EMPLOYEE_ID = E.EmployeeID '
  						. 'WHERE RA.FACILITY_CODE = ? AND RA.ROOM_NUMBER = ? '
  						. 'ORDER BY RA.ASSIGNEE_ROOM_PERCENT DESC';
							
		
    $stid = odbc_prepare($conn, $queryStr);
    odbc_execute($stid, $bindArray); //Execute query

    //Populate return array
    $arr['results']['roomAssignment'] = processQuery($stid);
    odbc_free_result($stid);
  	
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
