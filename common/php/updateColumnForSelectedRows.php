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
	
	$validKeys = array(
		'R' => array('R.ROOM_TYPE' => array('ROOM_TYPE',':rtup_bv',null,3,'SQLT_CHR'),
								 'R.ORGANIZATION' => array('ORGANIZATION',':rorgup_bv',null,10,'SQLT_CHR',array('ORG_NAME','SELECT OrgName as ORG_NAME FROM '.$tableOrg.' WHERE OrgCode = ?')),
								 'R.CAPACITY' => array('CAPACITY',':rcap_bv',null,4,'SQLT_INT') ),
		'RA' => array('RA.ASSIGNEE_ORGANIZATION' => array('ASSIGNEE_ORGANIZATION',':raorgup_bv',null,10,'SQLT_CHR'),
  								'RA.ASSIGNEE_EMPLOYEE_ID' => array('ASSIGNEE_EMPLOYEE_ID',':raeidup_bv',null,9,'SQLT_CHR'),
  								'RA.ASSIGNEE_ROOM_PERCENT' => array('ASSIGNEE_ROOM_PERCENT',':raperup_bv',null,3,'SQLT_INT'),
  								'RA.DEPT_NOTE' => array('DEPT_NOTE',':radnoteup_bv',null,256,'SQLT_CHR') ));

	$queryKind = 'R'; //Default to room table
	$updateTables = array($tableRoom); //Tables to update
	$queryStr = '';
	$queryKeys = array();
	$keyIdx = 0;
	//Iterate through room records items in request to update column
	foreach ($arr['request']['records'] as $recordID) {
		//Define variables from request array
		$facCode = $recordID[0];
		$roomNum = $recordID[1];
		if (count($recordID) > 2) {
			$queryKind = 'RA';
			$updateTables = array($tableRoomAssignment); //Tables to update
			$raOrg = $recordID[2];
			$raEID = $recordID[3];
		}
		$assignmentOrg = ''; //Check RA?
		$authorized = 0;
		$authorized = checkRoomAuthz($conn, $astraAuthz, $facCode, $roomNum, $assignmentOrg);
		//Check authorization for room
		if (!($authorized === 0)) {
			//Add room record request to query array and string
			if (strlen($queryStr) > 0) {
  				//$queryStr .= ', ';
					$queryStr .= ' OR ';
  		}
			/**if (!(isset($queryKeys['FACILITY_CODE_'.$facCode])))**/ $queryKeys['FACILITY_CODE_'.$keyIdx] = array('FACILITY_CODE',':faccode_'.$keyIdx.'_bv',$facCode,4,'SQLT_CHR');
			/**if (!(isset($queryKeys['ROOM_NUMBER_'.$roomNum])))**/ $queryKeys['ROOM_NUMBER_'.$keyIdx] = array('ROOM_NUMBER',':roomnum_'.$keyIdx.'_bv',$roomNum,13,'SQLT_CHR');
			//$queryStr .= '('.$queryKeys['FACILITY_CODE_'.$facCode][1].','.$queryKeys['ROOM_NUMBER_'.$roomNum][1];
			//$queryStr .= '(?,?';
			$queryStr .= 'FACILITY_CODE = ? AND ROOM_NUMBER = ?';
			if ($queryKind == 'RA') {
				/**if (!(isset($queryKeys['ASSIGNEE_ORGANIZATION_'.$raOrg])))**/ $queryKeys['ASSIGNEE_ORGANIZATION_'.$keyIdx] = array('ASSIGNEE_ORGANIZATION',':raorg_'.$keyIdx.'_bv',$raOrg,4,'SQLT_CHR');
				/**if (!(isset($queryKeys['ASSIGNEE_EMPLOYEE_ID_'.$raEID])))**/ $queryKeys['ASSIGNEE_EMPLOYEE_ID_'.$keyIdx] = array('ASSIGNEE_EMPLOYEE_ID',':raeid_'.$keyIdx.'_bv',$raEID,13,'SQLT_CHR');
				//$queryStr .= ','.$queryKeys['ASSIGNEE_ORGANIZATION_'.$raOrg][1].','.$queryKeys['ASSIGNEE_EMPLOYEE_ID_'.$raEID][1];
				//$queryStr .= ',?,?';
				$queryStr .= ' AND ASSIGNEE_ORGANIZATION = ? AND ASSIGNEE_EMPLOYEE_ID = ?';
			}
			//$queryStr .= ')';
			$keyIdx += 1;
		} else {
			$arr['results']['rowsNotUpdated'][] = array($facCode,$roomNum);
		}
	}
	//Create query string, define bind variable array, collect any return values, execute query
	if ($queryStr != '') {
		$setStr = 'MOD_NETID = ?, MOD_NETID_DATE = SYSDATETIME()';
		$bindArray = array('MOD_NETID' => array('MOD_NETID',':modnetid_bv',$userNetid,128,'SQLT_CHR'));
		$returnValues = array(); //Array of values to return
		foreach ($arr['request']['values'] as $key => $value) {
			//$setStr .= ', '.$validKeys[$queryKind][$key][0].' = '.$validKeys[$queryKind][$key][1];
			$setStr .= ', '.$validKeys[$queryKind][$key][0].' = ?';
			$bindArray[$validKeys[$queryKind][$key][0]] = array($validKeys[$queryKind][$key][0],$validKeys[$queryKind][$key][1],$value,$validKeys[$queryKind][$key][3],$validKeys[$queryKind][$key][4]);
			if (isset($validKeys[$queryKind][$key][5])) {
				$returnValues[] = array($validKeys[$queryKind][$key][5],$bindArray[$validKeys[$queryKind][$key][0]]); //Add to array to retrieve return value
			}
		}
		$bindArray = array_merge($bindArray, $queryKeys);
		//$updateTables = array($tableRoom); //array_merge(array($tableRoom,$tableRoomAssignment),$raChildTables); //Tables to update
		$rowsUpdated = 0;
		odbc_autocommit($conn, false); //Set autocommit to false to allow all queries to be commited/rolledback together
		//Process each table
    foreach ($updateTables as $table) {
			//Make query string for table
			$tableQueryStr = 'UPDATE ' . $table
  						. ' SET '.$setStr
							. ' WHERE '.$queryStr;
  						//. ' WHERE (FACILITY_CODE,ROOM_NUMBER'.($queryKind == 'RA' ? ',ASSIGNEE_ORGANIZATION,ASSIGNEE_EMPLOYEE_ID':'').') in ('.$queryStr.')';
  		//echo $tableQueryStr.PHP_EOL;
			$stid = odbc_prepare($conn, $tableQueryStr);
			$queryVals = array();
			foreach ($bindArray as $key => $value) {
				//echo json_encode(array($bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4])).PHP_EOL;
				//oci_bind_by_name($stid, $bindArray[$key][1], $bindArray[$key][2], $bindArray[$key][3], $bindArray[$key][4]);
				$queryVals[] = $bindArray[$key][2];
			}
			//VAR_DUMP($queryVals);
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
				
				//Get any return values
				foreach ($returnValues as $returnValue) {
					//var_dump($returnValue);
					$stid = odbc_prepare($conn, $returnValue[0][1]);
					//Bind variable
					//echo json_encode(array($returnValue[1][1], $returnValue[1][2], $returnValue[1][3], $returnValue[1][4]));
					//oci_bind_by_name($stid, $returnValue[1][1], $returnValue[1][2], $returnValue[1][3], $returnValue[1][4]);
					$r = odbc_execute($stid, array($returnValue[1][2])); //Execute query, do not commit
					if ($r === false) { //If query returned false, throw error and break loop
						$e = odbc_errormsg($conn);
						trigger_error(htmlentities($e), E_USER_ERROR);
						break;
					} else {
						while ($row = odbc_fetch_array($stid)) {
          		foreach ($row as $item) {
          			$arr['results']['values'][$returnValue[0][0]] = $item;
          		}
          	}
					}
				}
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
