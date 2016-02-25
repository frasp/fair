(function () {
    'use strict';

    app.controller('Flights', FlightsController);

    FlightsController.$inject = ['ryanAirFlightsService'];

    /**
    * @desc order directive that is specific to the order module at a company named Acme
    */
    function FlightsController(ryanAirFlightsService) {
        var vm = this;

        vm.context = {
            food: 'pizza',
            ryanAirFlights: [],
        };

        vm.getFlights = getFlights;
        vm.getRyanAirFlights = getRyanAirFlights;

        getRyanAirFlights('CRL', '2016-02-01', '2016-03-28');

        /**
        * @desc order directive that is specific to the order module at a company named Acme
        */
        function getFlights() {
            return "Flights";
        }

        /**
         * @function getRyanAirFlights.
         * @description : fonction renvoyant les vols Ryan air.
         * @param airportCode: code de l'aéroport de départ.
         * @param outboundDepartureDateFrom: date de départ.
         * @param outboundDepartureDateTo: date d'arrivée.
         */
        function getRyanAirFlights(airportCode, outboundDepartureDateFrom, outboundDepartureDateTo) {
            return ryanAirFlightsService.getRyanAirFlights(airportCode, outboundDepartureDateFrom, outboundDepartureDateTo).then(function (result) {
                if (result) {
                    vm.context.ryanAirFlights = result;
                    return vm.context.ryanAirFlights;
                }
            }, function () {
                console.log("error");
            });
        }
    }
})();