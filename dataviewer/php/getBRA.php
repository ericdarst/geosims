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
  	$arr['request'] = json_decode($_POST["json"], true);
  	
  	//Connection session variable
  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	//Request variables
  	$bgtNum = $arr['request']['BUDGET_NUMBER'];
  	$bgtFY = $arr['request']['BienniumYear'];
  	//$bindArray = array(":bgtnum_bv" => $bgtNum);//, ":bgtfy_bv" => $bgtFY);
		$bindArray = array($bgtNum);

  	//Room Assignment query string
  	$queryStr = 'SELECT RVG.FISCAL_YEAR_ENTERED, RVG.BUDGET_NUMBER, RVG.FACILITY_CODE, RVG.ROOM_NUMBER, RVG.ORGANIZATION, O.OrgName as ORG_NAME, RVG.EMPLOYEE_ID, RTRIM(E.DisplayName) AS EMPLOYEE_NAME, RA.ASSIGNEE_ROOM_PERCENT, RVG.PRIMARY_ROOM, '
  						. "(SELECT F.LONG_NAME + ' - ' + CAST(F.FACILITY_NUMBER as nvarchar) FROM " . $tableFacility . " F WHERE RVG.FACILITY_CODE = F.FACILITY_CODE) AS FACDESC "
  						. ", '(' + R.ROOM_TYPE + ' - ' + RT.PRIMARY_USE + ', ' + CAST(R.SQUARE_FEET as nvarchar) + ' sqft)' as ROOMDESC "
  						. ", RVG.ORGANIZATION + ' - ' + O.OrgName + ', ' + RVG.EMPLOYEE_ID + ' - ' + RTRIM(E.DisplayName) + ', ' + CAST(RA.ASSIGNEE_ROOM_PERCENT as nvarchar) + '%' as DESCR "
  						. ", RVG.ORGANIZATION + ',' + RVG.EMPLOYEE_ID + ',' + CAST(RA.ASSIGNEE_ROOM_PERCENT as nvarchar) AS ROOM_ASSIGNMENT "
  						. 'FROM ' . $tableRoomsVsGrants . ' RVG '
  						. 'LEFT JOIN ' . $tableRoom . ' R ON RVG.FACILITY_CODE = R.FACILITY_CODE AND RVG.ROOM_NUMBER = R.ROOM_NUMBER '
  						. 'LEFT JOIN ' . $tableRoomType . ' RT ON R.ROOM_TYPE = RT.ROOM_TYPE '
  						. 'LEFT JOIN ' . $tableRoomAssignment . ' RA ON RVG.FACILITY_CODE = RA.FACILITY_CODE AND RVG.ROOM_NUMBER = RA.ROOM_NUMBER AND RVG.ORGANIZATION = RA.ASSIGNEE_ORGANIZATION AND RVG.EMPLOYEE_ID = RA.ASSIGNEE_EMPLOYEE_ID '
  						. 'LEFT JOIN ' . $tableOrg . ' O ON RVG.ORGANIZATION = O.OrgCode '
  						. 'LEFT JOIN ' . $tableEmployee . ' E ON RVG.EMPLOYEE_ID = E.EmployeeID '
  						. 'WHERE RVG.BUDGET_NUMBER = ? ';
  						//. 'ORDER BY RA.ROOM_PERCENT DESC';
  	$arr['results']['roomAssignment'] = makeRoomInfoQuery($conn, $queryStr, $bindArray);	//Make query and populate results array

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
