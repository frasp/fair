(function () {
    'use strict';

    app.controller('Flights', FlightsController);

    /**
    * @desc order directive that is specific to the order module at a company named Acme
    */
    function FlightsController() {
        var vm = this;

        vm.context = {};

        vm.food = 'pizza';
        vm.getFlights = getFlights;
    }

    /**
    * @desc order directive that is specific to the order module at a company named Acme
    */
    function getFlights() {
        return "Flights";
    }

})();