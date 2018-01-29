(function() {
  const Chalk = require('chalk');
  const Async = require('async');
  const config = require('./config');
  const models = require('./models');
  const InfluencerRetriever = require('./get_influencers.js');
  const InfluencerActions = require('./actions_influencers.js');
  const InfluencerScore = require('./score_influencers.js'); //Logic class for searching what effect the influencer may have on the price of the currency
  let mongoose = null; // = require('mongoose');'
  const Influencer = models.Influencer;

  let searchTerms = ['#BTC', '$BTC', "#BITCOIN", "#bitcoin", "@bitcoin"];
  let influencerRetriever = new InfluencerRetriever(searchTerms);
  let influencerActions = new InfluencerActions(searchTerms);
  let influencerScore = new InfluencerScore();

  //RUN all the logic asyncronyously
  const logic = (async() => {
    //First connect to mongodb
    mongoose = await require('./mongo.connect.js');

    //Get a list of influencers ranked by their level of engagement (initially we aren't going to store them, just do it on the fly...)
    var results = await influencerRetriever.search(); //Finds new influencers and saves them to MONGO

    //Get all the people that the bot is following (INFLUENCERS we've checked in the past)
    var followerIdsList = await influencerActions.getFollowersList("cryptosensebot");
    console.log("People following cryptosensebot: ", followerIdsList.length);

    //----------------------------------------------------------------------
    //Existing followers/influencers that we have been following for a while
    // Step 1: Grab the last tweet we have on file for them
    // Step 2: Find all the tweets made by them since that archived tweets.
    // step 3: Add those new tweets, and reanalyze the influencer Score
    var reanalyzedCount = await new Promise(function(resolve, reject) {
      Influencer.find({ influenceChecked: true }, function(err, influencers) {
        if (!err && influencers.length > 0) {
          console.log("GRABBING NEW TWEETS FROM (", influencers.length, ") influencers...");

          //new tweets

          //Reanalyze

          //NOTE DO THIS AFTER THHE SECOND STUFF BELOW!
          resolve();
          console.log("TODO");
        } else {
          if (err)
            reject(err);
          else {
            console.log("-")
            resolve(0);
          }
        }
      });
    });

    //----------------------------------------------------------------------
    //Now get all of our influencers that we haven't checked the influence of
    var newInfluencersAnalyzed = await new Promise(function(resolve, reject) {
      console.log("Analyzing new influencers...")
      Influencer.find({ influenceChecked: false }, function(err, influencers) {
        var tasks = [];
        console.log(influencers.length)

        for (var i = 0; i < influencers.length; i++) {
          var obj = influencers[i];
          tasks.push(function(influencer) {
            return function(cb) {
              // Step 1: Check their tweets for the `searchTerms`
              console.log("Get tweets for", influencer.acccountName)
              influencerActions.getTweets(influencer).then(function(tweets) {
                console.log("TODO, search ", tweets.length, "tweets");
                // Step 2: Store the tweets that relate to bitcoin
              }, function(err) {
                console.log("PROBLEM GETTING USER", influencer.accountName, "TWEETS")
              })
            };
          }(obj))
        }

        Async.series(tasks, function(err, outputs) {
          if (err) {
            reject(err)
          } else {
            resolve(outputs.length);
          }
        });
      });
    });
    console.log("New influencers analyzed:", newInfluencersAnalyzed);
    //----------------------------------------------------------------------


    //FOR ALL INFLUENCERS we have in mongo. Re-compute their influencer score based on their tweets
    // Step 1: see what influence (via time) they have on bitcoin price)







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