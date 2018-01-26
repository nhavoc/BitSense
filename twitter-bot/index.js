(function() {
  const Chalk = require('chalk');
  const config = require('./config');
  const InfluencerRetriever = require('./get_influencers.js');
  const InfluencerActions = require('./actions_influencers.js');
  const InfluencerExplore = require('./explore_influencers.js'); //Logic class for searching what effect the influencer may have on the price of the currency
  let mongoose = null; // = require('mongoose');

  let searchTerms = ['#BTC', '$BTC', "#BITCOIN", "#bitcoin", "@bitcoin"];
  let influencerRetriever = new InfluencerRetriever(searchTerms);
  let influencerActions = new InfluencerActions(searchTerms);
  let influencerExplore = new InfluencerExplore(searchTerms);

  //RUN all the logic asyncronyously
  const logic = (async() => {
    //First connect to mongodb
    mongoose = await require('./mongo.connect.js');

    //Get a list of influencers ranked by their level of engagement (initially we aren't going to store them, just do it on the fly...)
    var results = await influencerRetriever.search(); //Finds new influencers and saves them to MONGO

    //Get all the people that the bot is following (INFLUENCERS we've checked in the past)
    var followerIdsList = await influencerActions.getFollowersList("cryptosensebot");

    //Existing followers/influencers that we have been following for a whille
    // Step 1: Grab the last tweet we have on file for them
    // Step 2: Find all the tweets made by them since that archived tweets.
    // step 3: Add those new tweets, and reanalyze the influencer Score


    //Now get all of our influencers that we haven't checked the influence of
    // Step 1: Follow those new influencers (this gives us access to their timelines and tweets (all time)
    // Step 2: Check their tweets for `searchTerms`
    // Step 3: Store the tweets that relate to bitcoin


    //FOR ALL INFLUENCERS we have in mongo. Re-compute their influencer score based on their tweets
    // Step 1: see what influence (via time) they have on bitcoin price)

    console.log("People following cryptosensebot: ", followerIdsList.length)





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