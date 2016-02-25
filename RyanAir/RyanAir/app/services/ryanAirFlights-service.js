(function () {
    'use strict';

    app.factory('ryanAirFlightsService', ryanAirFlightsService);

    ryanAirFlightsService.$inject = ['$http', '$q'];

    /**
    * @function ryanAirFlightsService.
    * @description : Service renvoyant les vols Ryan air.
    */
    function ryanAirFlightsService($http, $q) {
        return {
            getRyanAirFlights: getRyanAirFlights
        };

        /**
        * @function getRyanAirFlights.
        * @description : fonction renvoyant les vols à partir d'un aéroport et de 2 dates.
        * @param airportCode: code de l'aéroport de départ.
        * @param outboundDepartureDateFrom: date de départ.
        * @param outboundDepartureDateTo: date d'arrivée.
        */
        function getRyanAirFlights(airportCode, outboundDepartureDateFrom, outboundDepartureDateTo) {
            var response = null;
            var deferred = $q.defer();

            var apiUrl = 'https://api.ryanair.com/farefinder/3/oneWayFares?&departureAirportIataCode=' + airportCode + '&language=fr&offset=0&outboundDepartureDateFrom=' + outboundDepartureDateFrom + '&outboundDepartureDateTo=' + outboundDepartureDateTo;

            $http.get(apiUrl)
                    .success(function (result) {
                        response = result;
                        deferred.resolve(response);

                    }).error(function (data, error) {
                        deferred.reject(error);
                    });

            return deferred.promise;
        }

        //https://desktopapps.ryanair.com/fr-fr/availability?ADT=1&CHD=0&DateOut=2016-02-24&Destination=BCN&FlexDaysOut=4&INF=0&Origin=BVA&RoundTrip=false&TEEN=0
    };
})();