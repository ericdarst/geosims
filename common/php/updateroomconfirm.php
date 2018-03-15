<?php
//Check $_POST for pubcookie netid
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	require_once 'login.php';
	require_once 'common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	
	//Define return array
	$arr = array(
		'request' => json_decode($_POST["json"], true), //Populate request array
		'results' => array("rowsUpdated" => 0, "rowsNotUpdated" => array() ));
	
	//Connection session variable
	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
	
	$queryStr = '';
	$queryKeys = array();
	$keyIdx = 0;
	//Iterate through room records items in request to update confirm date and user
	foreach ($arr['request'] as $recordID) {
		//Define variables from request array
		$facCode = $recordID['FACILITY_CODE'];
		$roomNum = $recordID['ROOM_NUMBER'];
		$assignmentOrg = '';
		$authorized = 0;
		$authorized = checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum, $assignmentOrg);
		//Check authorization for room
		if (!($authorized === 0)) {
			//Add room record request to query array and string
			$queryKeys['FACILITY_CODE_'.$keyIdx] = array('FACILITY_CODE',':faccode'.$keyIdx.'_bv',$facCode,4,'SQLT_CHR');
			$queryKeys['ROOM_NUMBER_'.$keyIdx] = array('ROOM_NUMBER',':roomnum'.$keyIdx.'_bv',$roomNum,13,'SQLT_CHR');
			if (strlen($queryStr) > 0) {
  				$queryStr .= ' OR ';
  		}
			//$queryStr .= 'FACILITY_CODE = :faccode'.$keyIdx.'_bv AND ROOM_NUMBER = :roomnum'.$keyIdx.'_bv';
			$queryStr .= 'FACILITY_CODE = ? AND ROOM_NUMBER = ?';
			$keyIdx += 1;
		} else {
			$arr['results']['rowsNotUpdated'][] = array('FACILITY_CODE' => $facCode,'ROOM_NUMBER' => $roomNum);
		}
	}
	if ($queryStr != '') {
		$bindArray = array('CONFIRM_USER' => array('CONFIRM_USER',':cfrmusr_bv',$userNetid,128,'SQLT_CHR'),
											 'MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,'SQLT_CHR'));
		$bindArray = array_merge($bindArray, $queryKeys);
		$confirmTables = array_merge(array($tableRoom,$tableRoomAssignment),$raChildTables); //Tables to update
		$rowsUpdated = 0;
		odbc_autocommit($conn, false); //Set autocommit to false to allow all queries to be commited/rolledback together
		//Process each table
    foreach ($confirmTables as $table) {
			//Make query string for table
			$tableQueryStr = 'UPDATE ' . $table
  						. ' SET CONFIRM_USER = ?, CONFIRM_DATE = SYSDATETIME(), MOD_NETID = ?, MOD_NETID_DATE = SYSDATETIME() '
  						. 'WHERE '.$queryStr;
  		//echo $tableQueryStr.PHP_EOL;
			
			$stid = odbc_prepare($conn, $tableQueryStr);
			$queryVals = array();
			foreach ($bindArray as $key => $value) {
				//echo json_encode(array($bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4])).PHP_EOL;
				//oci_bind_by_name($stid, $bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4]);
				$queryVals[] = $bindArray[$key][2];
			}
			$r = odbc_execute($stid, $queryVals); //Execute query, do not commit
			if ($r === false) { //If query returned false, throw error and break loop
				break;
			} else {
				$rowsUpdated += odbc_num_rows($stid);  //Row count
			}
		}
		if ($r === false) { //If query returned false, throw error and rollback
			$e = odbc_errormsg($conn);
			odbc_rollback($conn);  //Rollback changes to both tables
      trigger_error(htmlentities($e), E_USER_ERROR);
		} else {
			//Commit queries
			$r = odbc_commit($conn);
			if ($r === false) { //If commit returned false, throw error and rollback
				$e = odbc_errormsg($conn);
				trigger_error(htmlentities($e), E_USER_ERROR);
			} else { //Success
				$arr['results']['rowsUpdated'] = $rowsUpdated;
				$arr['results']['value']['CONFIRM_DATE'] = strtoupper(date('d-M-y')); //Get date value from the database?
  			$arr['results']['value']['CONFIRM_USER'] = $userNetid;
			}		
		}
		odbc_free_result($stid);
		odbc_autocommit($conn, true);
	} else {
		//echo 'Invalid request.';
		$arr['results']['msg'] = 'Invalid request.';
		$arr['results']['rowsUpdated'] = 0;
	}
	
	//Close connection
	odbc_close($conn);

	//echo return array as json string
	echo json_encode($arr['results']);
	//echo json_encode($arr);
}
