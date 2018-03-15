<?php
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	require_once '../../common/php/common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
		require_once '../../common/php/login.php';
  	function makeQueryStr($selectKeys, $validSelectKeys, $whereKeys, $validWhereKeys, $validTblKeys) {
  		$returnArr = array();
  		$tableArr = array();
    	$selectStr = '';
			$orderStr = '';
    	foreach ($selectKeys as $key) {
    		if (array_key_exists($key,$validSelectKeys)) {
    			foreach ($validSelectKeys[$key][0] as $tblKey) {
    				if (!(in_array($tblKey,$tableArr,true))) {
    					$tableArr[] = $tblKey;
    				}
    			}
					
    			if (strlen($selectStr) > 0) { //Add comma delimiter
    				$selectStr .= ', ';
    			}
    			$selectStr .= $validSelectKeys[$key][1];
					
					if (!is_null($validSelectKeys[$key][2]) && strlen($orderStr) > 0) { //Add comma delimiter
    				$orderStr .= ', ';
    			}
					$orderStr .= $validSelectKeys[$key][2];
					
    			unset($validSelectKeys[$key]);
    		} else {
    			//echo 'Invalid column name: '.$key;
    			$returnStr = '';
    			return '';
    		}
    	}
    	$whereStr = '';
    	foreach ($whereKeys['ANDS'] as $key => $value) {
    		if (array_key_exists($key, $validWhereKeys)) {
    			$colParts = explode('.',$key);
    			if (!(in_array($colParts[0],$tableArr,true))) {
    				$tableArr[] = $colParts[0];
    			}
    			if (strlen($whereStr) > 0) {
    				$whereStr .= ' AND ';
    			}
    			if ($key == 'R.ORG7') { //ORG7 needs a 'like' statement
    				$whereStr .= $validWhereKeys[$key][0].' LIKE '.'?';//$validWhereKeys[$key][1];
    				$validWhereKeys[$key][2] = $value.'%';
    			} else {
    				$whereStr .= $validWhereKeys[$key][0]." = ".'?';//$validWhereKeys[$key][1];
    				$validWhereKeys[$key][2] = $value;
    			}
    			$returnArr[] = $validWhereKeys[$key];
    			unset($validWhereKeys[$key]);
    		} else {
    			//echo 'Invalid column name: '.$key;
    			return '';
    		}
    	}
    	//$whereStr .= ' AND ( ';
    	if (array_key_exists('ORS', $whereKeys)) {
      	foreach ($whereKeys['ORS'] as $orIdx => $orGroup) {
      		if ($orIdx == 0) {
      			$whereStr .= ' AND ( ';
      		} else {
      			$whereStr .= ' OR ';
      		}
      		$whereStr .= ' ( ';
      		$orGroupStr = '';
      		foreach ($orGroup as $key => $value) {
        		if (array_key_exists($key, $validWhereKeys)) {
        			$colParts = explode('.',$key);
        			if (!(in_array($colParts[0],$tableArr,true))) {
        				$tableArr[] = $colParts[0];
        			}
        			if (strlen($orGroupStr) > 0) {
        				$orGroupStr .= ' AND ';
        			}
        			if ($key == 'R.ORG7') { //ORG7 needs a 'like' statement
        				$orGroupStr .= $validWhereKeys[$key][0].' LIKE '.'?';//$validWhereKeys[$key][1];
        				$validWhereKeys[$key][2] = $value.'%';
        			} else {
        				$orGroupStr .= $validWhereKeys[$key][0]." = ".'?';//$validWhereKeys[$key][1];
        				$validWhereKeys[$key][2] = $value;
        			}
        			$returnArr[] = $validWhereKeys[$key];
        			unset($validWhereKeys[$key]);
        		} else {
        			//echo 'Invalid column name: '.$key;
        			return '';
        		}
      		}
      		$whereStr .= $orGroupStr.' ) ';
      		if (($orIdx + 1) == count($whereKeys['ORS'])) {
      			$whereStr .= ' ) ';
      		}
      	}
    	}
    	
    	$tblStr = '';
    	foreach ($tableArr as $tblKey) {
    		if (array_key_exists($tblKey,$validTblKeys)) {
    			$tblStr .= $validTblKeys[$tblKey][1];
    		} else {
        	//echo 'Invalid column name: '.$key;
        	return '';
        }
    	}
    	
    	return array(array($selectStr,$whereStr, $tblStr, $orderStr), $returnArr);
    }
    
  	//Define return array
  	$arr = array(
  		'request' => json_decode($_POST["json"], true)); //Populate request array
  	//$arr['request']['FACNUM'] = '1008';
  	//$arr['request']['FLOOR'] = '02';
  	
  	$validTblVars = array('R' => array($tableRoom.' R',''),
  												'RT' => array($tableRoomType.' RT','LEFT JOIN '.$tableRoomType.' RT ON R.ROOM_TYPE = RT.ROOM_TYPE '),
  												'O' => array($tableOrg.' O','LEFT JOIN '.$tableOrg.' O ON R.ORGANIZATION = O.OrgCode '),
  												'OD' => array($tableOrgDept.' OD','LEFT JOIN '.$tableOrgDept.' OD ON SUBSTRING(R.ORGANIZATION,1,7) = OD.ORG_DEPT '));
  												
  	$selectVars = $arr['request']['RETURN'];
  	//Add key columns
  	//$selectVars[] = 'R.ROOM_NUMBER';
  	$validSelectVars = array('R.ROOM_NUMBER' => array(array('R'),'R.ROOM_NUMBER',null),
  													 'R.ORGANIZATION' => array(array('R'),'R.ORGANIZATION',null),
  													 'R.ORG3' => array(array('R'),'SUBSTRING(R.ORGANIZATION,1,3) AS ORG3',null),
  													 'R.ORG7' => array(array('R'),'SUBSTRING(R.ORGANIZATION,1,7) AS ORG7',null),
  													 'R.ROOM_TYPE' => array(array('R'),'R.ROOM_TYPE',null),
  													 'R.CONFIRM_DATE' => array(array('R'),"ISNULL(DATEDIFF(DAY,R.CONFIRM_DATE,SYSDATETIME())+1,-1) * ABS(CHARINDEX('NONASGN', R.ORGANIZATION)-1) AS CONFIRM_DATE",'R.CONFIRM_DATE'),
  													 'RT.PRIMARY_USE' => array(array('RT'),'RT.PRIMARY_USE',"iif(left(R.ROOM_TYPE,1) = '0','X' + R.ROOM_TYPE, R.ROOM_TYPE)"),
  													 'RT.SPACE_CATEGORY' => array(array('RT'),'RT.SPACE_CATEGORY','RT.SPACE_CATEGORY'),
  													 'O.ORG_NAME' => array(array('O','R'),'O.OrgName as ORG_NAME, R.ORGANIZATION as ALT_DESC','R.ORGANIZATION'),
  													 'OD.ORG_DEPT_NAME' => array(array('OD','R'),'RTRIM(OD.ORG_DEPT_NAME) AS ORG_DEPT_NAME, SUBSTRING(R.ORGANIZATION,1,7) AS ALT_DESC','R.ORGANIZATION'),
  													 'OD.ORG_COLLEGE_NAME' => array(array('OD','R'),'RTRIM(OD.ORG_COLLEGE_NAME) AS ORG_COLLEGE_NAME, SUBSTRING(R.ORGANIZATION,1,3) AS ALT_DESC','R.ORGANIZATION'));
  	$whereVars = $arr['request']['WHERE'];
  	$validWhereVars = array('R.FACILITY_CODE' => array('R.FACILITY_CODE',':rfac_bv',null,4,'SQLT_CHR'),
    												'R.FLOOR_CODE' => array('R.FLOOR_CODE',':rflr_bv',null,13,'SQLT_CHR'),
    												'R.ORG7' => array('R.ORGANIZATION',':rorg_bv',null,8,'SQLT_CHR'),
    												'R.ORGANIZATION' => array('R.ORGANIZATION',':rorg_bv',null,10,'SQLT_CHR'),
  													'R.ROOM_TYPE' => array('R.ROOM_TYPE',':rrmt_bv',null,3,'SQLT_CHR'),
  													'RA.ASSIGNEE_ORGANIZATION' => array('RA.ASSIGNEE_ORGANIZATION',':raorg_bv',null,10,'SQLT_CHR'),
  													'RT.SPACE_CATEGORY' => array('RT.SPACE_CATEGORY',':rtsc_bv',null,20,'SQLT_CHR'));
  	
  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	if (array_key_exists('FACNUM', $whereVars['ANDS'])) {
  		$whereVars['ANDS']['R.FACILITY_CODE'] = getFacilityCode($conn, $whereVars['ANDS']['FACNUM']);
  		unset($whereVars['ANDS']['FACNUM']);
  	}

  	$returnArr = makeQueryStr($selectVars, $validSelectVars, $whereVars, $validWhereVars, $validTblVars);
  	//var_dump($returnArr);
  	if ($returnArr != '') {
      $bindArray = $returnArr[1];
      $queryStr = 'SELECT '.$returnArr[0][0]
      					. ' FROM '.$tableRoom.' R '
      					. $returnArr[0][2]
      					. 'WHERE '.$returnArr[0][1];
			if (strlen($returnArr[0][3]) > 0) $queryStr .= ' ORDER BY '.$returnArr[0][3]; //Add order by if populated

      //Process Query
      //echo $queryStr;
      $stid = odbc_prepare($conn, $queryStr);
      //Bind params to query
			$paramVals = array();
      foreach ($bindArray as $key => $value) {
				$paramVals[] = $bindArray[$key][2];
      }
      //Execute query
      odbc_execute($stid, $paramVals);

      $arr['results'] = array();
			while ($row = odbc_fetch_array($stid)) {
				$arr['results'][] = $row;
			}

      odbc_free_result($stid);
      odbc_close($conn);

      echo json_encode($arr['results']);
    } else {
    	echo '[]';
    }
  } else {
  	$arr['results']['msg'] = array(
  		'text' => 'Not authorized.',
  		'type' => 'failure');
  	echo json_encode($arr['results']);
  }
}

