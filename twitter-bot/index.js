(function() {
  const Chalk = require('chalk');
  const config = require('./config');
  const InfluencerRetriever = require('./get_influencers.js');
  let mongoose = null; // = require('mongoose');

  let influencerRetriever = new InfluencerRetriever();

  //RUN all the logic asyncronyously
  const logic = (async() => {
    //First connect to mongodb
    mongoose = await require('./mongo.connect.js');

    //Get a list of influencers ranked by their level of engagement (initially we aren't going to store them, just do it on the fly...)
    influencerRetriever.init(['#BTC', '$BTC', "#BITCOIN", "#bitcoin", "@bitcoin"]);
    var results = await influencerRetriever.search(); //Finds new influencers



    //Pull all most popular tweets from those main influencers (that contain the coin reference)

    //Grab their sentiment for each tweet

    //Compare each tweet's submission date with the bitcoin price a few hours later.

    //Correlation? (if so, save that tweet)

    //All the tweets that were correlating for that day, combine into a single tweet.

    //Submit the tweet to cryptosense-bot
    //  FORMAT: BTC price today at 12pm: $12000 USD
    //          Top 5 most popular influencial tweets:
    //          - RT @philip12342 Bitcoin is going to $100K !

    //TODO, do additional analysis weekly of the price and our predictions for the price the following week.

  });

  logic();


}());