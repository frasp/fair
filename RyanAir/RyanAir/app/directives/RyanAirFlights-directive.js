(function () {
    'use strict';

    app.directive('ryanAirFlights', ryanAirFlightsDirective);

    /**
    * @function ryanAirFlightsDirective.
    * @description : Directive renvoyant les vols Ryan air.
    */
    function ryanAirFlightsDirective(ryanAirFlightsService) {
        var directive = {
            scope: {
                ryanAirFaresData: "=ryanAirFaresData",
            },
            link: link,
            templateUrl: 'app/templates/ryanAirFlights.html'
        };

        return directive;

        /**
         * @function link.
         * @description : link.
         */
        function link(scope, element, attrs) {
            scope.getFlights = getFlights;

            scope.$watch('ryanAirFaresData', function (newValue) {
                scope.fares = scope.ryanAirFaresData;
            }, true);
        }

        /**
        * @function getFlights.
        * @description : fonction renvoyant les vols Ryan air.
        */
        function getFlights() {
            return "test";
        }
    };
})();