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
  	$facCode = getFacilityCode($conn, $arr['request']['FACNUM']);
  	$roomNum = $arr['request']['ROOM_NUMBER'];
  	$bindArray = array(":faccode_bv" => $facCode, ":roomnum_bv" => $roomNum);

  	//Room query string
  	$queryStr = 'SELECT R.FACILITY_CODE, R.ROOM_NUMBER, R.SQUARE_FEET, R.ROOM_TYPE, RT.PRIMARY_USE, R.ORGANIZATION, O.OrgName as ORG_NAME, R.CAPACITY, R.CONFIRM_USER, CAST(R.CONFIRM_DATE as smalldatetime) as CONFIRM_DATE '
  						. 'FROM ' . $tableRoom . ' R '
  						. 'LEFT JOIN ' . $tableRoomType . ' RT ON R.ROOM_TYPE = RT.ROOM_TYPE '
  						. 'LEFT JOIN ' . $tableOrg . ' O ON R.ORGANIZATION = O.OrgCode '
  						. 'WHERE R.FACILITY_CODE = ? AND R.ROOM_NUMBER = ? ';
  						//. 'AND ROWNUM = 1';
  	$arr['results']['room'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array

  	//Room Assignment query string
  	$queryStr = 'SELECT RA.FACILITY_CODE, RA.ROOM_NUMBER, RA.ASSIGNEE_ORGANIZATION, O.OrgName as ORG_NAME, RA.ASSIGNEE_EMPLOYEE_ID, E.DisplayName as EMPLOYEE_NAME, RA.ASSIGNEE_ROOM_PERCENT, RA.DEPT_NOTE '
  						. 'FROM ' . $tableRoomAssignment . ' RA '
  						. 'LEFT JOIN ' . $tableOrg . ' O ON RA.ASSIGNEE_ORGANIZATION = O.OrgCode '
  						. 'LEFT JOIN ' . $tableEmployee . ' E ON RA.ASSIGNEE_EMPLOYEE_ID = E.EmployeeID '
  						. 'WHERE RA.FACILITY_CODE = ? AND RA.ROOM_NUMBER = ? '
  						. 'ORDER BY RA.ASSIGNEE_ROOM_PERCENT DESC';
  	$arr['results']['roomAssignment'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array
  	
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
