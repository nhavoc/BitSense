import datetime as DT # date library for parsing dates
import time, sys
import re
import math
import tweepy
import random
import json
import operator # for sorting dictionaries
import nltk
nltk.download('punkt')
nltk.download('stopwords')
from rake_nltk import Rake
from tweepy import OAuthHandler
from textblob import TextBlob
from nltk.corpus import stopwords
from collections import Counter
from difflib import SequenceMatcher

#for plotting the results (WE NEED MORE DATA FROM MULTIPLE DATES TODO THIS)
import numpy as np
import matplotlib.mlab as mlab
import matplotlib.pyplot as plt


CALLS_LIMIT = 25; # GET a sample of `number` of sets of tweets for the day `until`
SEARCH = "Bitcoin" #What we are searching for on twitter

# TODO. For now this script only does analysis for the day before today. we need to have it collecting data back in the past and continually for the future.

#TODO: Twitter colllections for most valid tweets for the time https://developer.twitter.com/en/docs/tweets/curate-a-collection/overview/about_collections
class TwitterClient(object):
    '''
    Generic Twitter Class for tweet analysis.
    '''
    def __init__(self):
        '''
        Class constructor or initialization method.
        '''
        # keys and tokens from the Twitter Dev Console {REPLACE NAKUL's with a new accounts info} TODO: Don't store this in plain text on github...
        # NOTE: Twitter Rate Limit is 180 calls to the search API every 15 minutes
        consumer_key = '9DTwWsyG7fW8kOwjAeVAcewTn'
        consumer_secret = 'wYe6CC9IFSYWpD3Aw7VOPUQTKcBRBXLlzkynQZIPNO0N2WObXq'
        access_token = '140572718-iEofi8MBOS8akd4iqf1LpBX1xbo4SPHXxqgKhOC3'
        access_token_secret = 'xDTkuECXVK7iMj5slevgqrV1Pqj2vXTpqormkFeqvvjAK'

        # attempt authentication
        try:
            # create OAuthHandler object
            self.auth = OAuthHandler(consumer_key, consumer_secret)
            # set access token and secret
            self.auth.set_access_token(access_token, access_token_secret)
            # create tweepy API object to fetch tweets
            self.api = tweepy.API(self.auth) #, wait_on_rate_limit=True) #NOTE: In production, we want this script to wait for the rate limiting to be over
        except:
            print("Error: Authentication Failed")

    def days_before(self, days = 1):
        # Return the date for `days` days before DT in the format YYYY-MM-DD
        return (DT.date.today() - DT.timedelta(days=days)).strftime('%Y-%m-%d')


    def clean_tweet(self, text):
        '''
        Clean the text of the tweet and remove all characters we don't care about as well as remove whitespace.
        This makes it easy todo analysis on the text and makes it easier to display later
        '''
        #Remove all line breaks [NOT WORKING ALL OF THE TIME! TODO]
        text = text.replace('\n', ' ')
        text = text.replace('\t', '')
        text = text.replace('\r', '')
        text = text.strip()

        #Remove extra spaces (multiple)
        text = ' '.join(text.split())

        # Remove all non-ascii characters
        text = ''.join((c for c in text if 0 < ord(c) < 127))

        # Normalize case
        text = text.lower()

        # Remove URLS. (I stole this regex from the internet.)
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)

        # Fix classic tweet lingo
        text = re.sub(r'\bthats\b', 'that is', text)
        text = re.sub(r'\bive\b', 'i have', text)
        text = re.sub(r'\bim\b', 'i am', text)
        text = re.sub(r'\bya\b', 'yeah', text)
        text = re.sub(r'\bcant\b', 'can not', text)
        text = re.sub(r'\bwont\b', 'will not', text)
        text = re.sub(r'\bid\b', 'i would', text)
        text = re.sub(r'wtf', 'what the fuck', text)
        text = re.sub(r'\bwth\b', 'what the hell', text)
        text = re.sub(r'\br\b', 'are', text)
        text = re.sub(r'\bu\b', 'you', text)
        text = re.sub(r'\bk\b', 'OK', text)
        text = re.sub(r'\bsux\b', 'sucks', text)
        text = re.sub(r'\bno+\b', 'no', text)
        text = re.sub(r'\bcoo+\b', 'cool', text)
        text = re.sub(r'&amp;', '&', text)

        #Don't need to worry about emoticons apparently (text blob ignores them or handles them well)

        return text;

    def remove_similar_tweets(self, tweets):
        '''
        Some tweets are similar to one another. If we find some that are, then we need to remove them from out tweets list
        We want to most unique tweet set we can get to get more information.
        Research: https://stackoverflow.com/questions/17388213/find-the-similarity-percent-between-two-strings
        '''
        # NOTE: don't try this on a large dataset, its only really for making sure we aren't showing super similar text to the user on displaying out data

        dictionary = {} #Store all the unique tweets here
        for tweet in tweets:
            text = tweet['text'].decode('string_escape') #turn raw string into a string literal
            # if theres a duplicate. Pick the most engaged tweet to replace the others
            if(text in dictionary):
                #okay we have a similar tweet
                if(tweet['engagement']['retweets'] > dictionary[text]['engagement']['retweets']):
                    #new tweet would have more engagements
                    dictionary[text] = tweet #replace old tweet
                else:
                    continue; #Skipp this tweet, we have a similar one.
            else:
                dictionary[text] = tweet #uniq tweet

        desired_list = dictionary.values()

        return desired_list #

    def get_tweet_sentiment(self, tweetText):
        '''
        Utility function to classify sentiment of passed tweet
        using textblob's sentiment method
        '''
        # create TextBlob object of passed tweet text
        analysis = TextBlob(tweetText);

        # Correct spelling (WARNING: SLOW)
        #analysis = analysis.correct()

        # set sentiment
        if analysis.sentiment.polarity >= 0.1:
            return {"type": 'positive', "raw": analysis.sentiment}
        elif analysis.sentiment.polarity <= -0.1:
            return {"type": 'negative', "raw": analysis.sentiment}
        else:
            return {"type": 'neutral', "raw": analysis.sentiment}

    def get_important_content(self, tweets):
        '''
        Gets the most important portions of text from the most engaged tweets
        https://github.com/csurfer/rake-nltk
        '''

        # Get all most important text of tweets
        important_text_in_tweets = []

        #Get the top 20 retweeted tweets [Most important]
        top_retweeted = sorted(tweets, key=lambda k: k['engagement']['retweets'], reverse=True)[:20]

        #Sort the top retweeted by their likes (somewhat important)
        top_retweeted = sorted(tweets, key=lambda k: k['engagement']['likes'], reverse=True)

        #Grab the top 10 of the most important tweets and get the most valid content inside each tweet
        for tweet in top_retweeted[:10]:
            r = Rake()
            r.extract_keywords_from_text(tweet["text"])
            most_important_content_in_tweet = r.get_ranked_phrases()[:3] #Get the top 3 ranked phrases from tweet (probably most important)
            important_text_in_tweets = important_text_in_tweets + most_important_content_in_tweet; # Put the keywords found in the tweet into the list of other keywords

        # NOTE. I thought about doing some more analysis. But this should be good for allowing us todo future analysis on what people were talking about generally in that set of tweets

        return important_text_in_tweets

    # Get the hashtags from all the tweets.
    def get_top_tags(self, tweets):
        all_hashtags = []
        # Get all the hashtags
        for tweet in tweets:
            all_hashtags = all_hashtags + [i  for i in tweet['text'].split() if i.startswith("#")]

        #Sort by frequency (most frequent first)
        counts = Counter(all_hashtags)
        all_hashtags = sorted(all_hashtags, key=counts.get, reverse=True)

        return list(set(all_hashtags)) #turn into a set to remove the duplicates

    def get_tweets(self, query, count = 100, lang = 'en', until = None, result_type = "mixed", max_id = None):
        '''
        Main function to fetch tweets and parse/analyze them.
        '''
        # empty list to store parsed tweets
        tweets = []

        if(until is None):
            until = days_before(0); #yesterday

        try:
            # call twitter api to fetch tweets
            fetched_tweets = self.api.search(q = query, count = count, lang = lang, until = until, result_type = result_type, max_id = max_id, include_entities = False, tweet_mode= "extended")

            # parsing tweets one by one
            for tweet in fetched_tweets:
                # Ignore retweets
                if re.match(r'^RT.*', tweet.full_text):
                    continue

                # empty dictionary to store required params of a tweet
                parsed_tweet = {}

                #SAVE ALL THE IMPORTANT DATA WE NEED TO STORE
                # Save the tweet's ID
                parsed_tweet['id'] = tweet.id
                #Save the created at date
                parsed_tweet['created_at'] = tweet.created_at;
                # saving text of tweet
                parsed_tweet['text'] = self.clean_tweet(tweet.full_text)
                # saving sentiment of tweet
                sentiment_obj = self.get_tweet_sentiment(parsed_tweet['text'])
                #Store the type of sentiment in place text ('negative', 'positive', 'neutral')
                parsed_tweet['sentimentType'] = sentiment_obj['type']
                # Store the polarity of the sentiment (1-0). > 0 = positive. < 0 = negative
                parsed_tweet['sentimentPolarity'] = sentiment_obj['raw'].polarity
                # Store Likes, Retweets
                parsed_tweet['engagement'] = { "likes": tweet.favorite_count, "retweets": tweet.retweet_count }

                # appending parsed tweet to tweets list
                if tweet.retweet_count > 0:
                    # if tweet has retweets, ensure that it is appended only once
                    if parsed_tweet not in tweets:
                        tweets.append(parsed_tweet)
                else:
                    tweets.append(parsed_tweet)

            # return parsed tweets
            return tweets

        except tweepy.TweepError as e:
            # print error (if any)
            print("Error : " + str(e))

def main():
    # creating object of TwitterClient Class
    api = TwitterClient()

    '''
        SEARCH QUERY PARAMS TO USE:
        result_type [what type of result, recent, mixed, popular. default: mixed]
        count [max 100]
        until YYYY-MM-DD [7 day limit, no tweets are found for a date older then a week]
        since_id [returns ids of tweets after this id]
        max_id [returns ids of tweets before this id, including max_id]
        lang [languge of the tweets to retrieve eg. 'en']
    '''
    max_id = None
    until = api.days_before(0) #for now, 0 means before today
    query = SEARCH
    result_type = "mixed" #mixture of popular and recent

    tweets = [] #Full list of tweets

    #Get list of tweets for the last few days
    print('Get %d sets of tweets...\n' % (CALLS_LIMIT));
    limit = 0;
    while limit < CALLS_LIMIT:
        new_tweets = []
        new_tweets = api.get_tweets(query = query, count = 100, lang = 'en', until = until, result_type = result_type, max_id = max_id)

        if(len(new_tweets) > 0):
            # Sort based on newest to oldest tweets
            new_tweets.sort(key=lambda r: r['created_at'], reverse=True);

        # If the last tweet we already have is the same as the first tweet in the new tweets list, remove it from the new tweets, we don't want it
        # Note: this duplication happens due to twitter's api when using the max_id param
        if(( len(tweets) > 0 and len(new_tweets) ) > 0 and ( tweets[len(tweets)-1]['id'] == new_tweets[0]['id']) ):
            new_tweets.pop(0) #remove that first element, we already have it

        if(len(new_tweets) != 0):
            #concat the new tweets to our full tweets list
            tweets = tweets + new_tweets

            #SHOW OUTPUT OF GATHERING TWEETS [TODO: Fix the flush not working]
            msg = u"\u001b[1000D" + str(limit) + ' - Tweets now: ['+str(len(tweets))+'] {+} ('+str(len(new_tweets))+') new tweets\n'
            sys.stdout.write("\r {:<70}".format(msg)) # Pad with extra spaces
            sys.stdout.flush()
            # END SHOW OUTPUT

            #Get the first tweet in the set and set max_id to be that tweets id
            max_id = new_tweets[len(new_tweets)-1]['id']
            limit+=1;
        else:
            #We got no tweets back. Must mean there are no more tweets left in after 'Until'
            print("%d Calls made to Twitter API" % (limit))
            break; #stop looping

    # REMOVE SIMILAR TWEETS (some tweets are Retweets and need to be removed, we only care about the most engaged tweets vs the copycats)
    tweets = api.remove_similar_tweets(tweets)

    # NOW GIVE US A RUNDOWN OF THE TWEETS FOR THE current `until` timespan
    #TODO Later, we will turn all this data into a storeable form for MONGODB
    print("# of tweets: %d" % (len(tweets)) )
    print("Time Span: %s to %s" % (tweets[0]['created_at'], tweets[len(tweets)-1]['created_at']))
    # picking positive tweets from tweets
    ptweets = [tweet for tweet in tweets if tweet['sentimentType'] == 'positive']
    positive_percentage = 100*len(ptweets)/len(tweets)
    # percentage of positive tweets
    print(u"\u001b[32mPositive tweets percentage:\u001b[0m {} %".format(positive_percentage))

    # picking negative tweets from tweets
    nttweets = [tweet for tweet in tweets if tweet['sentimentType'] == 'neutral']
    # percentage of negative tweets
    print(u"\u001b[37;1mNeutral tweets percentage:\u001b[0m {} %".format(100*len(nttweets)/len(tweets)))

    # picking negative tweets from tweets
    ntweets = [tweet for tweet in tweets if tweet['sentimentType'] == 'negative']
    negative_percentage = 100*len(ntweets)/len(tweets);
    # percentage of negative tweets
    print(u"\u001b[31;1mNegative tweets percentage:\u001b[0m {} %".format(negative_percentage))

    #General Consensus
    good_or_bad = 'meh'
    if(negative_percentage > positive_percentage):
        good_or_bad = "Negative"
    else:
        good_or_bad = "Positive"
    print(u"General Consenses is: %s" % (good_or_bad))

    print('\n');

    # printing top positive tweets
    print(u"\u001b[1m\u001b[32m> Most Positive tweets\u001b[0m (Sentiment - TEXT):")
    for tweet in sorted(ptweets, key=lambda k: k['sentimentPolarity'], reverse=True)[:10]:
        print("   %.2f - %s" % (tweet['sentimentPolarity'], tweet['text']) ).encode('utf-8')

    #Neutral Tweets
    print(u"\n\u001b[1m\u001b[37;1m> Random sample of Neutral tweets\u001b[0m (TEXT-only):")
    sample_size = 10
    if(len(nttweets) < sample_size):
        sample_size = len(nttweets)
    for tweet in [ nttweets[i] for i in sorted(random.sample(xrange(len(nttweets)), sample_size)) ]:
        print("   - %s" % (tweet['text']) ).encode('utf-8')

    # printing top negative tweets
    print(u"\n\u001b[1m\u001b[31;1m> Most Negative tweets\u001b[0m (Sentiment - TEXT):")
    for tweet in sorted(ntweets, key=lambda k: k['sentimentPolarity'])[:10]:
        print("   %.2f - %s" % (tweet['sentimentPolarity'], tweet['text']) ).encode('utf-8')

    # Print out most Engaged Tweets
    # Most Retweeted Tweets
    print(u"\n\u001b[1m\u001b[36m> Top 5 Retweeted Tweets:\u001b[0m")
    count = 0;
    for tweet in sorted(tweets, key=lambda k: k['engagement']['retweets'], reverse=True)[:5]:
        if(tweet['engagement']['retweets'] != 0):
            count+=1
            print("   %d - %s" % (tweet['engagement']['retweets'], tweet['text']) ).encode('utf-8')
    if(count == 0):
        print('none...');

    # Most Favourited Tweets
    print(u"\n\u001b[1m\u001b[33m> Top 5 Favourited Tweets:\u001b[0m")
    count = 0;
    for tweet in sorted(tweets, key=lambda k: k['engagement']['likes'], reverse=True)[:5]:
        if(tweet['engagement']['likes'] != 0):
            count+=1
            print("   %d - %s" % (tweet['engagement']['likes'], tweet['text']) ).encode('utf-8')
    if(count == 0):
        print('none...');

    # Most Important Content Overall for the day
    print(u"\n\u001b[34;1m> Most important Content:\u001b[0m")
    important_content = api.get_important_content(tweets) #Returns full list of important content from the most engaged tweets (retweets and likes) [retweets are more important, likes are secondary]
    for content in important_content[:15]:
        print("   %s" % (content));

    #STATS:
    print("\nStats:");
    print(u" \u001b[1m\u001b[33mTotal Favourites\u001b[0m: %d" % (sum(tweet['engagement']['likes'] for tweet in tweets)))
    print(u" \u001b[1m\u001b[36mTotal Retweets\u001b[0m: %d" % (sum(tweet['engagement']['retweets'] for tweet in tweets)))
    tags = api.get_top_tags(tweets) #Later use this data for more analysis (note its sorted by most frequently used)
    print(" Top Tags (10): %s" % (', '.join(tags[:10])))
    #END - Stats

if __name__ == "__main__":
    # calling main function
    main()