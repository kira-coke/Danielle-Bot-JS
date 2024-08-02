const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient

//function for the inital adding of a user to the database only
async function saveUserData(userId, timeStamp) {
  const params = {
      TableName: 'Dani-bot-playerbase',
      Item: {
          'user-id': userId,
          'Balance': 10000,
          'Enabled': true,
          'JoinDate': timeStamp, 
          'FavCard' : "NJDNSPN",  //remember to update if you get rid of the card in database
          'Description': "Default Profile",
          'cardCount' : 0,
          'LookingFor': ["n/a"],
          'DailyStreak': 0,
          'TotalExp': 0, 
          'Reminders': true
      }
  };

  try {
      await dynamodb.put(params).promise();
  } catch (err) {
      console.error('Unable to save data:', err);
  }
} 

async function checkUserExists(userId) {
  const params = {
      TableName: 'Dani-bot-playerbase',
      Key: {
          'user-id': userId
      }
  };

  try {
      const data = await dynamodb.get(params).promise();
      return !!data.Item;
  } catch (err) {
      console.error('Unable to check if user exists:', err);
      return false;
  }
}

async function checkUserDisabled(userId){
  const params = {
      TableName: 'Dani-bot-playerbase',
      Key: {
          'user-id': userId
      }
  };
  try {
      const data = await dynamodb.get(params).promise();
      return !!data.Item.Enabled;;
  } catch (err) {
      console.error('Unable to check if user exists:', err);
      return false;
  }
}

async function getUser(userId){
      const params = {
          TableName: 'Dani-bot-playerbase',
          Key: {
              'user-id': userId
          }
      };

      try {
          const data = await dynamodb.get(params).promise();
          return data.Item;
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

async function setUserCard(tableName, userId, attribute){
    const updateCount = 'SET #FavCard = :newFavCard';
    const expressionAttributeValues = {
        ':newFavCard': attribute // New value for 'copies-owned'
    };
    const expressionAttributeNames = {
        '#FavCard': 'FavCard' // Attribute name alias for 'copies-owned'
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        // Call DynamoDB update API
        const data = await dynamodb.update(params).promise();
        return data.Attributes; // Return the updated attributes
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

async function setUserAlbum(tableName, userId, attribute){
    const updateCount = 'SET #FavAlbum = :newFavAlbum';
    const expressionAttributeValues = {
        ':newFavAlbum': attribute // New value for 'copies-owned'
    };
    const expressionAttributeNames = {
        '#FavAlbum': 'FavAlbum' // Attribute name alias for 'copies-owned'
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        // Call DynamoDB update API
        const data = await dynamodb.update(params).promise();
        return data.Attributes; // Return the updated attributes
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

async function getFavAlbum(tableName, userId) {
    const params = {
        TableName: tableName,
        Key: {
            'user-id': userId
        },
        ProjectionExpression: 'FavAlbum' // Only retrieve the FavAlbum attribute
    };

    try {
        // Call DynamoDB get API
        const data = await dynamodb.get(params).promise();

        if (data.Item) {
            // Return the favorite album if it exists
            return data.Item.FavAlbum || null; // Return null if FavAlbum attribute is not present
        } else {
            // User does not exist
            return null;
        }
    } catch (err) {
        console.error('Unable to get user favorite album:', err);
        return null;
    }
}

async function setUserBio(tableName, userId, attribute){
    const updateCount = 'SET #Description = :newBio';
    const expressionAttributeValues = {
        ':newBio': attribute 
    };
    const expressionAttributeNames = {
        '#Description': 'Description' 
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        // Call DynamoDB update API
        const data = await dynamodb.update(params).promise();
        return data.Attributes; // Return the updated attributes
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

async function setUserWishList(tableName, userId, attribute){
    const updateCount = 'SET #LookingFor = :newWL';
    const expressionAttributeValues = {
        ':newWL': attribute 
    };
    const expressionAttributeNames = {
        '#LookingFor': 'LookingFor' 
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        const data = await dynamodb.update(params).promise();
        return data.Attributes; // Return the updated attributes
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

async function getUserWishList(tableName, userId) {
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            ProjectionExpression: '#LookingFor', // Only retrieve the 'LookingFor' attribute
            ExpressionAttributeNames: {
                '#LookingFor': 'LookingFor' 
            }
        };

        const data = await dynamodb.get(params).promise();

        if (data.Item && data.Item.LookingFor) {
            const wishlistArray = data.Item.LookingFor.split(',').map(item => item.trim());
            return wishlistArray; // Return the wishlist array
        } else {
            return []; // Return null if wishlist is not found
        }
    } catch (err) {
        console.error('Unable to retrieve user wishlist:', err);
        return false;
    }
}

async function getUserCards(tableName, userId) {
    const params = {
        TableName: tableName,
        FilterExpression: '#pk = :pk',
        ExpressionAttributeNames: {
            '#pk': 'user-id' // The actual attribute name in the table
        },
        ExpressionAttributeValues: {
            ':pk': userId // The value you are filtering by
        },
        ReturnConsumedCapacity: 'TOTAL' // Request consumed capacity details
    };

    let items = [];
    let lastEvaluatedKey = null;
    let retryCount = 0;
    const maxRetries = 5;

    do {
        try {
            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const data = await dynamodb.scan(params).promise();

            // Log consumed capacity information
            if (data.ConsumedCapacity) {
                console.log('Consumed Capacity:', data.ConsumedCapacity);
            }

            items = items.concat(data.Items);
            lastEvaluatedKey = data.LastEvaluatedKey;

            // Reset retry count on successful operation
            retryCount = 0;

        } catch (error) {
            if (error.code === 'ProvisionedThroughputExceededException') {
                console.warn('Throttling error:', error);
                retryCount++;
                if (retryCount >= maxRetries) {
                    throw new Error('Max retries exceeded');
                }
                const delay = Math.pow(2, retryCount) * 100; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('Error scanning table:', error);
                throw error;
            }
        }
    } while (lastEvaluatedKey);

    return items;
}



async function setAutoReminders(tableName, userId, attribute){
    const updateCount = 'SET #Reminders = :newValue';
    const expressionAttributeValues = {
        ':newValue': attribute 
    };
    const expressionAttributeNames = {
        '#Reminders': 'Reminders' 
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        const data = await dynamodb.update(params).promise();
        return data.Attributes; // Return the updated attributes
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

async function updateTotalExp(tableName, userId, attribute){
    const updateCount = 'SET #TotalExp= :newTotalExp';
    const expressionAttributeValues = {
        ':newTotalExp': attribute // New value for 'copies-owned'
    };
    const expressionAttributeNames = {
        '#TotalExp': 'TotalExp' // Attribute name alias for 'copies-owned'
    };
    try {
        const params = {
            TableName: tableName,
            Key: {
                'user-id': userId, 
            },
            UpdateExpression: updateCount,
            ExpressionAttributeValues: expressionAttributeValues,
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: "UPDATED_NEW" // Returns only the updated attributes
        };

        // Call DynamoDB update API
        const data = await dynamodb.update(params).promise();
        return data.Attributes; // Return the updated attributes
      } catch (err) {
          console.error('Unable to check if user exists:', err);
          return false;
      }
}

async function setDisplayPreference(tableName, userId, preference) {
    try {
        // Validate preference (optional depending on your application logic)
        if (preference !== 'favCard' && preference !== 'favAlbum') {
            throw new Error('Invalid preference value');
        }

        // Construct update parameters
        const updateParams = {
            TableName: tableName,
            Key: {
                'user-id': userId,
            },
            UpdateExpression: 'SET displayPreference = :preference',
            ExpressionAttributeValues: {
                ':preference': preference
            },
            ReturnValues: "UPDATED_NEW"
        };

        // Update user profile
        const data = await dynamodb.update(updateParams).promise();
        return data.Attributes; // Return the updated attributes
    } catch (err) {
        console.error('Error setting display preference:', err);
        return false;
    }
}


module.exports = {checkUserDisabled, checkUserExists, saveUserData, getUser, setUserCard, setUserBio, setUserWishList, getUserCards, setAutoReminders, updateTotalExp, getUserWishList, setUserAlbum, setDisplayPreference, getFavAlbum};
