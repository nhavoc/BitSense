(function() {
  // Author: Matthew Rowlandson
  // InfluencerRetriever
  // Purpose: This class will go through twitter searching for the most important influencers for a search term/terms.
  //          It is only a retrieval tool for a list of influencers that it then saves to MongoDB
  //          DO NOTE: There are going to be a lot of garbage influencers we retrieve. That is to be expected. We need to create some sort of ranking system to filter out the junk to find the gold. See rank_influencers.js

  const async = require('async');
  const config = require('./config');
  const twitterConfig = config.twitter;
  const Twit = require('twit');
  const mongoose = require('mongoose'); //Our connection to mongo via ORM
  const moment = require('moment');

  let Twitter = new Twit(twitterConfig);
  let models = require('./models');
  let Influencer = models.Influencer;

  const TWEET_COUNT = 100; //MAX IS 100
  const SAMPLE_SIZE = 50; //Number of tweets to retrieve (out of 100)
  const RESULT_TYPE = "mixed"; //recent, mixed, popular

  let InfluencerRanker = function(searchTerms) {
    this.mostPopularTweets = [];
    this.lastTweet = null;

    this.search = async function() {
      var self = this; //Reference to the class instance
      return new Promise(function(resolve, reject) {
        console.log("Searching twitter for influencers...");

        //For each search term we have. Lets look for the TOP tweets
        var tasks = [];

        for (var i = 0; i < searchTerms.length; i++) {
          tasks.push(function(searchTerm) {
            return function(cb) {
              var params = {
                q: searchTerm,
                result_type: RESULT_TYPE,
                count: TWEET_COUNT,
                lang: 'en',
                since_id: self.lastTweet
              }
              //NOTE:  Keep in mind that the search index has a 7-day limit.
              Twitter.get('search/tweets', params, function(err, data) {
                // if there no errors
                if (!err) {
                  var formattedTweets = [];
                  for (var j = 0; j < data.statuses.length; j++) {
                    //For each tweet
                    formattedTweets.push({ user: { fullName: data.statuses[j].user.name, accountName: data.statuses[j].user.screen_name, followers: data.statuses[j].user.followers_count, description: data.statuses[j].user.description, userId: data.statuses[j].user.id_str }, date: data.statuses[j].created_at, text: data.statuses[j].text, retweets: data.statuses[j].retweet_count, id: data.statuses[j].id, retweetedByMe: data.statuses[j].retweeted });
                  }
                  if (formattedTweets.length > 0) {
                    //Sort by date, grab the last one
                    var dateToId = [];
                    for (j = 0; j < formattedTweets.length; j++) {
                      var tweet = formattedTweets[j];
                      dateToId.push({ id: tweet.id, unixDate: moment(tweet.date, "ddd MMM DD HH:mm:ss +ZZ YYYY", 'en').valueOf() }); //convert date to unix format (ms)
                    }

                    //Sort the tweets by their date created
                    dateToId = dateToId.sort(function(a, b) {
                      if (parseInt(a.unixDate) > parseInt(b.unixDate)) {
                        return 1;
                      } else if (parseInt(a.unixDate) < parseInt(b.unixDate)) {
                        return -1;
                      } else {
                        return 0;
                      }
                    });

                    self.lastTweet = dateToId[dateToId.length - 1].id;
                  }

                  cb(null, formattedTweets)
                } else {
                  //There was an error
                  cb({ "code": "TWITTER_ERROR", "desc": "Twitter returned an error", "full": err });
                }
              });
            }
          }(searchTerms[i]));
        }

        async.series(tasks, function(err, results) {
          if (err) {
            console.log(err.code, err.desc, err.full)
            reject(err.full);
          } else {
            results = [].concat.apply([], results); //Merge the arrays of arrays

            //SORT BY USER's number of followers, meaning they probably know what they are talking about when they tweet..
            results.sort(function(a, b) {
              if (a.user.followers < b.user.followers) {
                return 1;
              } else if (a.user.followers > b.user.followers) {
                return -1
              } else {
                return 0;
              }
            });

            var sampleOfTweetsByExposure = results.slice(0, SAMPLE_SIZE);

            //Sort sample by engagement.
            sampleOfTweetsByExposure.sort(function(a, b) {
              if (a.retweets < b.retweets) {
                return 1;
              } else if (a.retweets > b.retweets) {
                return -1
              } else {
                return 0;
              }
            });

            //Grab the 30 top retweeted tweets from the people with the most followers (meaning more exposure to the market)
            self.mostPopularTweets = self.mostPopularTweets.concat(sampleOfTweetsByExposure.slice(0, SAMPLE_SIZE));

            //Now, get all the influencers.
            var influencersList = {}; //using object to keep track of duplicates
            for (var k = 0; k < self.mostPopularTweets.length; k++) {
              influencersList[self.mostPopularTweets[k].user.accountName] = self.mostPopularTweets[k].user;
            }

            var uniqInfluencers = Object.values(influencersList);

            //SAVE THESE INFLUENCERS or update existing
            var bulk = Influencer.collection.initializeUnorderedBulkOp(); //Setup to do a bulk insert
            for (var i = 0; i < uniqInfluencers.length; i++) {
              bulk.find({"influenceChecked": false, "accountName": uniqInfluencers[i].accountName }).upsert().updateOne({ $setOnInsert: uniqInfluencers[i] });
            }

            bulk.execute(function(err, result) {
              if (!err && result.isOk()) {
                console.log("New influencers: ", result.getUpsertedIds().length);
                resolve(result.getUpsertedIds().length);
              } else {
                console.log("There was an issue")
                reject(err);
              }
            });
          }
        });
      });
    };
  };

  module.exports = InfluencerRanker;
}()); //End Anon Closure