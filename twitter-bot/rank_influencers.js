(function() {
  //Library for ranking influencers (using multiple metrics)

  const models = require('./models');
  const Influencer = models.Influencer;


  module.exports = function() {

    let sortTweetsByDate = function(tweets){

      return tweets;
    };

    this.rankInfluencers = function() {
      // Grab all the influencers (that have some tweets [0 exists, meaning first index exists])
      Influencer.find({"tweets.0": { "$exists": true }}, function(err, influencers) {

        // Get all their tweets, sort them by date.
        for(var i=0; i< influencers.length; i++){
          tweets.concat(influencers)
        }

        // Grab all the prices of bitcoin (sorted by date)

        //For each tweet, get the sentiment (positive or negative?)

        // Compare the tweets
      });
    }
  };
}());