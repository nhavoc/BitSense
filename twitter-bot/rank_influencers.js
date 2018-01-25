(function() {
  // Author: Matthew Rowlandson
  // InfluencerRanker
  // Purpose: This class will go through twitter searching for the most important influencers for a search term/terms
  const async = require('async');
  //Global Vars
  let Twitter;
  let Mongo; //Our connection to mongo via ORM

  let InfluencerRanker = function(TwitterConnection, mongoose) {
    Twitter = TwitterConnection;
    Mongo = mongoose; //note, we don't use this right now...
    this.mostPopularTweets = [];
    this.lastTweet = null;

    this.init = function(searchTerms, influencerCountLimit) {
      this.searchTerms = searchTerms;
      this.influencerCounterLimit = influencerCountLimit;
      console.log("Init");
    };

    this.search = async function() {
      var self = this; //Reference to the class instance
      return new Promise(function(resolve, reject) {
        console.log("Searching twitter for influencers...");

        //For each search term we have. Lets look for the TOP tweets
        var tasks = [];

        for (var i = 0; i < self.searchTerms.length; i++) {
          tasks.push(function(searchTerm) {
            return function(cb) {
              var params = {
                q: searchTerm,
                result_type: 'popular',
                count: 100,
                lang: 'en',
                since_id: self.lastTweet
              }
              //NOTE:  Keep in mind that the search index has a 7-day limit.
              Twitter.get('search/tweets', params, function(err, data) {
                // if there no errors
                if (!err) {
                  console.log("Statuses Found: ", data.statuses.length);
                  var formattedTweets = [];
                  for (var j = 0; j < data.statuses.length; j++) {
                    //For each tweet
                    formattedTweets.push({ user: { fullName: data.statuses[j].user.name, accountName: data.statuses[j].user.screen_name, followers: data.statuses[j].user.followers_count, description: data.statuses[j].user.description, favouritesCount: data.statuses[j].user.favourites_count, }, date: data.statuses[j].created_at, text: data.statuses[j].text, retweets: data.statuses[j].retweet_count, id: data.statuses[j].id, retweetedByMe: data.statuses[j].retweeted });
                  }
                  if(formattedTweets.length >0) {
                    self.lastTweet = formattedTweets[formattedTweets.length-1].id;
                  }

                  cb(null, formattedTweets)
                } else {
                  //There was an error
                  cb({ "code": "TWITTER_ERROR", "desc": "Twitter returned an error", "full": err });
                }
              });
            }
          }(self.searchTerms[i]));
        }

        async.series(tasks, function(err, results) {
          if (err) {
            console.log(err.code, err.desc, err.full)
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

            var sampleOfTweetsByExposure = results.slice(0, 50);

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
            self.mostPopularTweets = self.mostPopularTweets.concat(sampleOfTweetsByExposure.slice(0, 50));

            //Now, get all the influencers.
            var influencersList = {}; //using object to keep track of duplicates
            for(var k=0; k < self.mostPopularTweets.length; k++){
              influencersList[self.mostPopularTweets[k].user.accountName] = self.mostPopularTweets[k].user;
            }

            console.log(Object.values(influencersList));

          }
        });
      });
    };
  };

  module.exports = InfluencerRanker;
}()); //End Anon Closure