<?php
//Define return array
$arr = array(
	//'request' => $_GET["q"],
	'items' => array() );

if (isset($_SERVER['HTTP_UWNETID'])) {
  require_once 'common.php';
  $userNetid = $_SERVER['HTTP_UWNETID'];
	$astraAuthz = getAstraInfo($userNetid, false); //Get ASTRA authorizations for netid
	if (hasAuthz($astraAuthz)) { //If user is authorized
	  require_once 'login.php';
  	
		if (!empty($_GET["q"])) {
			//Check if search string is numeric and 6 digits long.  If so, process as bdgt num and query on BudgetNbr. If not, query by BudgetName.
			$request = $_GET["q"]; //The requested search string
			$requestSansHyphen = str_replace("-","",$request); //Remove first hyphen
			if (is_numeric($requestSansHyphen) && strlen($requestSansHyphen) == 6) {
				$request = $requestSansHyphen;
				$bindArray = array($requestSansHyphen);
				$queryStr = "SELECT TOP 100 BudgetNbr as BUDGET_NUMBER, BienniumYear, BudgetNbr + ' - ' + RTRIM(BudgetName) as DESCR "
									. "FROM " . $tableBudget . " "
									. "WHERE BudgetNbr = ?";
			} else {
				$bindArray = array($request);
				$queryStr = "SELECT TOP 100 BudgetNbr as BUDGET_NUMBER, BienniumYear, BudgetNbr + ' - ' + RTRIM(BudgetName) as DESCR "
									. "FROM " . $tableBudget . " "
									. "WHERE PATINDEX('%'+?+'%',BudgetName) != 0 "
									. "ORDER BY BudgetNbr ASC";
			}
		} else {
			//If no search string, check for org and PI eid, and return all bdgt records for that org and PI eid
			$queryStrWhere = array();
			$bindArray = array();
			//Check for org. Ignore nonasgn, unknown, notuw
			if (isset($_GET["ORGANIZATION"]) && $_GET["ORGANIZATION"] != 'NONASGN' && $_GET["ORGANIZATION"] != 'UNKNOWN' && $_GET["ORGANIZATION"] != 'NOTUW') {
				$queryStrWhere[] = "B.OrgCode = ? ";
				$bindArray[] = $_GET["ORGANIZATION"];
			}
			//Check for PI eid. Ignore 999999999
			if (isset($_GET["EMPLOYEE_ID"]) && $_GET["EMPLOYEE_ID"] != '999999999') {
				$queryStrWhere[] = "B.PrincipalInvestigatorId = ? ";
				$bindArray[] = $_GET["EMPLOYEE_ID"];
			}
			//Make queryStr if valid org or PI eid found
			if (!empty($queryStrWhere) && !empty($bindArray)) {
				$queryStr = "SELECT TOP 500 B.BudgetNbr as BUDGET_NUMBER, B.BienniumYear, B.BudgetNbr + ' - ' + RTRIM(B.BudgetName) as DESCR "//, CASE WHEN UG.BudgetNbr IS NULL THEN 0 ELSE 1 END as Unassigned "
									. "FROM " . $tableBudget . " B "
									//. "LEFT JOIN UNASSIGNED_GRANTS UG ON B.BudgetNbr = UG.BudgetNbr "
									. "WHERE " . implode(" AND ", $queryStrWhere) . " "
									. "ORDER BY B.BudgetNbr ASC";
			}
		}
		
		//Execute query
		if (!empty($queryStr) && !empty($bindArray)) {
			$conn = createConn($db_username,$db_password,$db_server,$db_database);  //Connection property variables defined in login.php
			$stid = odbc_prepare($conn, $queryStr);
			//oci_bind_by_name($stid,":reqVal_bv",$request); //Bind query variable
			odbc_execute($stid, $bindArray);

			$arr['items'] = processQuery($stid);
			$arr['identifier'] = 'BUDGET_NUMBER';

			odbc_free_result($stid);
			odbc_close($conn);
		}
  }
}

echo json_encode($arr);
