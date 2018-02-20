(function() {
  // Author: Matthew Rowlandson @treeless
  // Description: This class is used for retrieving the bitcoin prices
  // Solution: https://stackoverflow.com/questions/16143266/get-bitcoin-historical-data
  // TODO: Get bitcoin prices for the PAST: http://api.bitcoincharts.com/v1/csv/localbtcCAD.csv.gz (updated regularly (each day))
  // TODO: bitcoin prices in realtime: https://www.bitstamp.net/websocket/
  // (column 1) the trade's timestamp
  // (column 2) the price
  // (column 3) the volume of the trade

  //TODO: https://www.bitstamp.net/websocket/ for live btc/usd prices via listening via a websocket.

  const request = require('request');

  module.exports = function() {
    //private


    //Public
    this.getHistoricalPrices = function() {
      //Get the bitstamp CSV
      request.get('http://api.bitcoincharts.com/v1/csv/bitstampUSD.csv.gz', function(err, data, response) {
        if (err || response.statusCode != 200) {
          console.log("Issue getting the historical bitcoin data.");
          return;
        }

        console.log(data);
        //Read in the data and parse it as individual pieces of data
        //If we already have the date of the row, ignore it.
        //otherwise, create a price record.
      });
    }

    this.listenToRealtime = function() {
      //
    }
  }
}());