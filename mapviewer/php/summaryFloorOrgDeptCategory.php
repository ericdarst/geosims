<?php
if ((!empty($_POST["json"])) && (isset($_SERVER['HTTP_UWNETID']))) {
	require_once '../../common/php/login.php';
	require_once '../../common/php/common.php';
	$userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
  	//Define return array
  	$arr = array(
  		'request' => json_decode($_POST["json"], true)); //Populate request array
  	//$arr['request']['FACNUM'] = '1008';
  	//$arr['request']['FLOOR'] = '02';
  	
  	$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
  	
  	$facCode = getFacilityCode($conn, $arr['request']['FACNUM']);
  	$floor = $arr['request']['FLOOR'];
  	
  	$queryStr = "select rt.SPACE_CATEGORY, o.OrgName as ORG_DEPT_NAME, substring(r.organization,1,7) as ORG7, sum(r.square_feet) as SQUARE_FEET "
  						. "from " . $tableRoom . " r "
  						. "left join " . $tableRoomType . " rt on r.room_type = rt.room_type "
  						. "left join " . $tableOrg . " o on substring(r.organization,1,7) + iif(isnumeric(r.organization) = 1,'000','') = o.OrgCode "
  						. "where facility_code = ? and floor_code = ? "
  						. "group by rt.space_category, o.OrgName, substring(r.organization,1,7)";
  	
  	$stid = odbc_prepare($conn, $queryStr);
  	//oci_bind_by_name($stid,":faccode_bv",$facCode,4,SQLT_CHR);
  	//oci_bind_by_name($stid,":floorcode_bv",$floor,13,SQLT_CHR);
  	odbc_execute($stid, array($facCode, $floor));

  	$deptSqftArray = array();
  	$orgDeptArray = array();
  	$orgDeptCodeArray = array();
  	while ($row = odbc_fetch_array($stid)) {
  		//$arr['results'][] = $row;
  		$orgDeptName = ($row['ORG_DEPT_NAME'] != "") ? trim($row['ORG_DEPT_NAME']) : $row['ORG7'] . '000';
  		$orgDeptCode = $row['ORG7'];
  		$categoryDesc = $row['SPACE_CATEGORY'];
  		$orgDeptArray[$orgDeptName][$categoryDesc] = (int) $row['SQUARE_FEET'];
  		$orgDeptCodeArray[$orgDeptName] = $orgDeptCode;
  		$deptSqftArray[$orgDeptName] = (!(array_key_exists($orgDeptName, $deptSqftArray))) ? (int) $row['SQUARE_FEET'] : $deptSqftArray[$orgDeptName] + (int) $row['SQUARE_FEET'];
  	}
  	asort($deptSqftArray); //Sort departments by total square feet
  	
  	$categoryArray = array();
  	$orgDeptCount = count($deptSqftArray);
  	$idx = 0;
  	foreach ($deptSqftArray as $orgDept => $value) {
  		foreach ($orgDeptArray[$orgDept] as $spaceCat => $sqft) {
  			if (!(array_key_exists($spaceCat, $categoryArray))) {
  				$categoryArray[$spaceCat] = array_pad(array(),$orgDeptCount,0);
  			}
  			$categoryArray[$spaceCat][$idx] = $sqft;
  		}
  		$idx++;
  	}

  	odbc_free_result($stid);
  	odbc_close($conn);
  	
  	ksort($categoryArray); //Sort categories alphabetically
  	
  	echo json_encode(array('DEPT_CODES' => $orgDeptCodeArray,
  												 'DEPT_SQFT' => $deptSqftArray,
  												 'SPACE_CATEGORIES' => $categoryArray));
  } else {
  	$arr['results']['msg'] = array(
  		'text' => 'Not authorized.',
  		'type' => 'failure');
  	echo json_encode($arr['results']);
  }
}

?>
