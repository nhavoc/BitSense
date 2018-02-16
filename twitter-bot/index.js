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

  let searchTerms = ['#BTC', '$BTC', "#BITCOIN", "#Bitcoin", "#bitcoin", "@bitcoin", "bitcoin", "BTC", "#bitcoinnews"];
  let influencerRetriever = new InfluencerRetriever(searchTerms);
  let influencerActions = new InfluencerActions(searchTerms);
  let influencerScore = new InfluencerScore();

  //APP FUNCTION VARIABLES (for dev)
  const FIND_INFLUENCERS = false; //Allow the process of going through twitter, finding influencers, getting their tweets etc
  const RANK_INFLUENCERS = true; //Allow the ranking process of influencers
  //

  //RUN all the logic asyncronyously
  const logic = (async() => {
    //First connect to mongodb
    mongoose = await require('./mongo.connect.js');

    if (FIND_INFLUENCERS) {
      //Get a list of influencers ranked by their level of engagement (initially we aren't going to store them, just do it on the fly...)
      var results = await influencerRetriever.search(); //Finds new influencers and saves them to MONGO

      //Get all the people that the bot is following (INFLUENCERS we've checked in the past)
      var followerIdsList = await influencerActions.getFollowersList("cryptosensebot");
      console.log("People following cryptosensebot: ", followerIdsList.length);

      //----------------------------------------------------------------------
      //Now get all of our influencers tweets
      var influencersAnalyzed = await new Promise(function(resolve, reject) {
        console.log("Analyzing new influencers...")
        Influencer.find({}, function(err, influencers) {
          var tasks = [];

          for (var i = 0; i < influencers.length; i++) {
            var obj = influencers[i];
            tasks.push(function(influencer) {
              return function(cb) {
                // Step 1: Check their tweets for the `searchTerms`
                console.log("Getting ", ((influencer.tweetsAnalyzedCount > 0) ? Chalk.blue("RECENT") : Chalk.yellow("ALL")), "tweets for", influencer.accountName)
                //Search all tweets made by the influencer for new tweets with once of the search terms. Save them
                function getTweets(callback) {
                  influencerActions.getTweetsAndAnalyze(influencer).then(function(info) {
                    //info object: totalInfluencerRelatedTweets, analyzedTweetsCount, searchTermsTweetsCount
                    if (info == null) {
                      //influencer must have been removed, continue
                      return callback();
                    }
                    if (info.analyzedTweetsCount == 0) {
                      console.log("DONE getting tweets for:", influencer.accountName)
                      callback(); //done
                    } else {
                      //Get more!
                      console.log("total:", info.totalInfluencerRelatedTweets, "analyzed:", info.analyzedTweetsCount, "NEW:", (info.searchTermsTweetsCount) ? Chalk.green(info.searchTermsTweetsCount.toString() + "++") : '')
                      getTweets(callback);
                    }
                  }, function(err) {
                    console.log("PROBLEM GETTING USER", influencer.accountName, "TWEETS")
                    callback(err);
                  })
                }

                getTweets(cb); //Start off the chain

              };
            }(obj))
          }

          Async.series(tasks, function(err, outputs) {
            if (err) {
              console.log(Chalk.red("THERE WAS AN ERROR :S"), ":", err);
              reject(err)
            } else {
              resolve(outputs.length);
            }
          });
        });
      });
      console.log("Influencers analyzed:", influencersAnalyzed);
      //----------------------------------------------------------------------
    } //End of FIND_INFLUENCERS functionality


    //FOR ALL INFLUENCERS we have in mongo. Compute their 'influencer score' using metrics outlined below
    // Step 1: see what influence (via time span 1-2 days after POST) they have on bitcoin price, based on sentiment of tweet as well.)
    // Step 2: Influencer follower count
    // Step 3: Maturity of account (how long its been around)
    // Step 4: Bitcoin to non bitcoin tweet percentage [More chatter is bad?]

    if (RANK_INFLUENCERS) {
      console.log("RANKING INFLUENCERS...")
    }







    //Overall
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