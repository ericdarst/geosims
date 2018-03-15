<?php
//Define return array
$arr = array(
	//'request' => $_GET["q"],
	'items' => array() );

if ((!empty($_GET["q"])) && isset($_SERVER['HTTP_UWNETID'])) {
  require_once 'common.php';
  $userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
	  require_once 'login.php';
  	$request = $_GET["q"]; //The requested search string

  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	//Check if search string is numeric.  If so, process as org code and query on OrgCode.
  	//If not, query by OrgName.
  	if (is_numeric($request)) {
  		$reqLen = strlen($request);
  		if ($reqLen < 3) { //If the search string is less than three characters search at Level 2 (Dean/VP) of org codes
				$searchVal = str_pad($request,3,'_',STR_PAD_RIGHT) . '0000000';
  		} elseif ($reqLen < 7) { //If the search string is less than seven characters search at Level 4 (Department) of org codes
				$searchVal = str_pad($request,7,'_',STR_PAD_RIGHT) . '000';
  		} else {
				$searchVal = $request . '%';
			}
  		$queryCol = 'OrgCode';
  	} else {
			$searchVal = $request . '%';
  		$queryCol = 'OrgName';
  	}
  	
  	//Query string.  Results limited to 100 entries.
  	$queryStr = "SELECT TOP 100 OrgCode as ORGANIZATION, MAX(OrgCode + ' - ' + OrgName) as DESCR "
  					  . "FROM " . $tableOrg . " "
  					  . "WHERE PATINDEX(?," . $queryCol . ") != 0 "
							. "AND (BienniumEndPurgeInd <> '1' OR BienniumEndPurgeInd is null) "
  					  . "GROUP BY OrgCode "
  					  . "ORDER BY OrgCode ASC";
  	
  	$stid = odbc_prepare($conn, $queryStr);
  	odbc_execute($stid, array($searchVal));

  	$arr['items'] = processQuery($stid);
  	$arr['identifier'] = 'ORGANIZATION';
		$arr['queryStr'] = $queryStr;
		$arr['searchVal'] = $searchVal;

  	odbc_free_result($stid);
  	odbc_close($conn);
  }
}

echo json_encode($arr);
