<?php
 
require_once('lib/nusoap.php');
 
class Astra
{
// \---------------------------------------------------------------------\-
// The following are configuration parameters. Set them appropriately.
// \---------------------------------------------------------------------\-
public $DefaultAstraServerURI = "https://astra.admin.uw.edu/astraws/v2/default.asmx?wsdl";
public $SSLCertFile = "certs/geosims.crt";
public $SSLKeyFile = "certs/geosims.pem";
//ublic $SSLCAFile = "certs/UWServicesCA.cer";
 
// \---------------------------------------------------------------------\-
// END CONFIGURATION PARAMETERS
// \---------------------------------------------------------------------\-
/**\*
* Default constructor.
\*
* Initializes a new Astra client and uses the $DefaultAstraServerURI
\*
\*/
 
function \__construct(){ $this->uri = $this->DefaultAstraServerURI; }
 
/**\*
* Initializes a new Astra client for a speicific server
\*
* @param server $ServerUri The server to connect to.
\*/
function \__constrct($ServerUri){ $this->uri = $ServerUri; }
 
/\*
\*
* This method calls the GetAuthZ method to retrieve valid authorizations.
\*
* This method is used to retrieve authorization information. The only parameter is a named
* array of search parameters. More than one parameter can be specified.
* The following keys are valid:
* RegID, NetID, EmpID, EnvCode, PrivCode, RoleCode, ActionCode,AstraRoleCode
\*
* Example:
* GetAuthz(array("NetID"=>"TestNetID","EnvCode"=>"eval","PrivCode"=>testpriv"));
\*
* @param array $SearchOptions The search options.
\*/
 
function GetAuthz($SearchOptions)
{
$client = new nusoap_client($this->uri,false);
$err = $client->getError();
if ($err)
die($err);
 
// Setup credentials for the connection
$cert["sslcertfile"] = $this->SSLCertFile;
$cert["sslkeyfile"] = $this->SSLKeyFile;
$cert["cainfofile"] = $this->SSLCAFile;
 
$client->setCredentials(null,null,"certificate",$cert);
 
// Create the outgoing SOAP message.
$message = "<GetAuthz xmlns=\"http://astra.admin.uw.edu/astra/v2\"><authFilter>";
 
if (\!empty($SearchOptions["NetID"]) \|\| \!empty($SearchOptions["RegID"]) \|\| \!empty($SearchOptions["EmpID"])) {
$message .= "<party xsi:type=\"Person\" ";
if (\!empty($SearchOptions["NetID"])){ $message .= "uwNetid="".$this->xml_entities($SearchOptions["NetID"])."" "; }
if (\!empty($SearchOptions["EmpID"])){ $message .= "employeeId="".$this->xml_entities($SearchOptions["EmpID"])."" "; }
if (\!empty($SearchOptions["RegID"])){ $message .= "regid="".$this->xml_entities($SearchOptions["RegID"])."" "; }
$message .= "/>";
}
if (\!empty($SearchOptions["EnvCode"])){ $message .= "<environment code="".$this->xml_entities($SearchOptions["EnvCode"])."" />"; }
if (\!empty($SearchOptions["AstraRoleCode"])){ $message .= "<astraRole code="".$this->xml_entities($SearchOptions["AstraRoleCode"])."" />"; }
if (\!empty($SearchOptions["PrivCode"]){ $message .= "<privilege code="".$this->xml_entities($SearchOptions["PrivCode"])."" />"; }
if (\!empty($SearchOptions["RoleCode"])){ $message .= "<role code="".$this->xml_entities($SearchOptions["RoleCode"])."" />"; }
if (\!empty($SearchOptions["ActionCode"])){ $message .= "<action code="".$this->xml_entities($SearchOptions["ActionCode"])."" />"; }
 
$message .= "</authFilter></GetAuthz>";
 
// Serialize the message with the appropriate headers.
$mysoapmsg = $client->serializeEnvelope($message,'',array(),'document','literal');
 
// Make the call.
$response = $client->send($mysoapmsg, "http://astra.admin.uw.edu/astra/v2/GetAuthz");
 
$err = $client->getError();
if ($err){ die ($err); }
// The response array
$ResponseArray = array();
 
// Now attempt to take the response and make it into a class. We "always" have the top
// array of authz->authCollection .
if ($response["authz"]["authCollection"]["auth"]) {
$responses = $response["authz"]["authCollection"]["auth"];
// Special case for when only one response is returned.
if (count($responses) > 0) {
if (array_key_exists("party",$responses)){ $responses = array(0=>$responses); }
}
 
// For each response create it into an object.
foreach ($responses as $aResponse) {
// Create a dummy object.
$objResponse = false;
 
// Go through and add each major section (this is like party, role, etc.)
foreach ($aResponse as $major=>$minorArray) {
// Span of control should be an array of it's own\!
if ($major=="spanOfControlCollection") {
$objResponse->spanOfControlCollection = array ();
if ($minorArray) {
$minorArray = $minorArray["spanOfControl"];
 
// handle the special case that there is only one spanOfControl
if (is_array($minorArray[0]) == false){ $minorArray = array ($minorArray); }
foreach ($minorArray as $aControl) {
$objControl = false;
// Add each minor key as a key value.. this would be something like code=value.
foreach ($aControl as $key=>$val) {
// For some reason things come back with an \! in front of them.
if ($key[0] == "\!"){ $key = substr($key,1); }
$objControl \->{$key} = $val;
}
 
array_push($objResponse->spanOfControlCollection, $objControl);
}
}
}
else if ($minorArray) {
$objResponse->{$major} = null;
 
// Add each minor key as a key value.. this would be something like code=value.
foreach ($minorArray as $key=>$val) {
// For some reason things come back with an \! in front of them.
if ($key[0] == "\!"){ $key = substr($key,1); }
$objResponse->{$major}->{$key} = $val;
}
}
}
array_push($ResponseArray, $objResponse);
}
}
return $ResponseArray;
}
 
/**\*
* Encodes XML entities
\*
* Taken from [http://php.net/manual/en/function.htmlentities.php]
* @param string $text
* @param mixed $charset
* @return string
\*/
function xml_entities($text, $charset = 'Windows-1252'){
// Debug and Test
// $text = "test & ™ ™ abc ® ® \-";
 
// First we encode html characters that are also invalid in xml
$text = htmlentities($text, ENT_COMPAT, $charset, false);
 
// XML character entity array from Wiki
// Note: ' is useless in UTF-8 or in UTF-16
$arr_xml_special_char = array(""","&","'","<",">");
 
// Building the regex string to exclude all strings with xml special char
$arr_xml_special_char_regex = "(?";
foreach($arr_xml_special_char as $key => $value) { $arr_xml_special_char_regex .= "(?!$value)"; }
$arr_xml_special_char_regex .= ")";
 
// Scan the array for &something_not_xml; syntax
$pattern = "/$arr_xml_special_char_regex&([a-zA-Z0-9|a-zA-Z0-9]+;-) /";
 
// Replace the &something_not_xml; with &something_not_xml;
$replacement = '&${1}';
return preg_replace($pattern, $replacement, $text);
}
 
// The URI to connect to
private $uri;
} // end class Astra
 
?>