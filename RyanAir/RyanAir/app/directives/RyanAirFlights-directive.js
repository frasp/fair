app.directive('ryanAirFlights', ryanAirFlightsDirective);

/**
* @desc order directive that is specific to the order module at a company named Acme
*/
function ryanAirFlightsDirective() {
    var directive = {
        scope: {},
        link: link,
        templateUrl: 'app/templates/ryanAirFlights.html'
    };

    return directive;

    /**
    * @desc order directive that is specific to the order module at a company named Acme
    */
    function link(scope, element, attrs) {
        scope.getFlights = getFlights;
    }

    /**
    * @desc order directive that is specific to the order module at a company named Acme
    */
    function getFlights() {
        return "test";
    }
}