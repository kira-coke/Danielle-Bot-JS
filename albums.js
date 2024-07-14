const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient
const { createCanvas, loadImage } = require('canvas');
const {getCardFromTable} = require("./cards")

async function createAlbum(userId, albumName){
  const totalSlots = 8;
  try {
    const albumNames = await getAlbums(userId);
    console.log(albumNames);

    if (albumNames.includes(albumName)) {
      return false;
    }
    const positions = Array(totalSlots).fill(null);
    const params = {
        TableName: 'user-albums',
        Item: {
            'user-id': userId,
            'albumName': albumName, 
            positions: positions
        }
    };

    await dynamodb.put(params).promise();
    console.log(`Album '${albumName}' created successfully!`)
    return true;;
  } catch (error) {
    console.error('Error creating album:', error);
    throw new Error('Could not create album');
  }
  
}

async function addCardToAlbum(userId, albumName, cardId, position){
    const albumNames = await getAlbums(userId);

    if (!albumNames.includes(albumName)) {
      console.log("User does not own album with this name");
      return;
    }

  const getParams = {
      TableName: 'user-albums',
      Key: {
          'user-id': userId,
          'albumName': albumName
      }
  };
  try {
    const result = await dynamodb.get(getParams).promise();
    let album = result.Item;

    if (!album) {
        console.log("Album data could not be retrieved");
        throw new Error('Album data could not be retrieved');
    }

    // Initialize the album positions if they don't exist
    //console.log(album);

    // Add the cardId to the specified position
    album.positions[position-1] = cardId;
    //console.log(album);
    const updateParams = {
      TableName: 'user-albums',
      Key: {
          'user-id': userId,
          'albumName': albumName
      },
      UpdateExpression: 'set #positions = :positions',
      ExpressionAttributeNames: {
          '#positions': 'positions'
      },
      ExpressionAttributeValues: {
          ':positions': album.positions
      }
    };

    await dynamodb.update(updateParams).promise();
    console.log(`Card '${cardId}' added to album '${albumName}' at position ${position}`);
    } catch (error) {
    console.error('Error updating album:', error);
    throw new Error('Could not update album');
    }
}

async function generateAlbumImage(userId, albumName) {
    const canvas = createCanvas(3300, 2200);
    const ctx = canvas.getContext('2d');
    const cardWidth = 800;  // Width of each card
    const cardHeight = 1120; // Height of each card
    const columns = 4;      // Number of columns
    const albumData = await getAlbum(userId, albumName);
    const albumCards = albumData.positions;

    // Helper function to load an image
    const loadImageAsync = async (cardId) => {
        try {
            const card = await getCardFromTable("cards", cardId);
            return await loadImage(card["cardUrl"]);
        } catch (error) {
            console.log(error);
            console.log("No card likely given");
            return null;
        }
    };

    // Load all images in parallel
    const imagePromises = albumCards.map(cardId => cardId ? loadImageAsync(cardId) : Promise.resolve(null));
    const images = await Promise.all(imagePromises);

    // Draw images on the canvas
    images.forEach((img, i) => {
        if (img) {
            const x = (i % columns) * cardWidth;
            const y = Math.floor(i / columns) * cardHeight;
            ctx.drawImage(img, x, y, cardWidth, cardHeight);
        }
    });

    return canvas.toBuffer();
}


async function getAlbums(userId){
  const params = {
    TableName: 'user-albums',
    KeyConditionExpression: '#uid = :userId',
    ExpressionAttributeNames: {
        '#uid': 'user-id'
    },
    ExpressionAttributeValues: {
        ':userId': userId
    }
  };

  try {
    const result = await dynamodb.query(params).promise();
    // Extract album names from the query result
    const albumNames = result.Items.map(item => item.albumName);
    return albumNames;
  } catch (error) {
    console.error('Error fetching albums:', error);
    throw new Error('Could not fetch albums');
  }
}

async function getAlbum(userId, albumName) {
    const params = {
        TableName: 'user-albums',
        Key: {
            'user-id': userId,
            'albumName': albumName
        }
    };

    try {
        const result = await dynamodb.get(params).promise();
        if (!result.Item) {
            console.log("Album not found");
            throw new Error('Album not found');
        }
        return result.Item;
    } catch (error) {
        console.error('Error getting album:', error);
        throw new Error('Could not retrieve album');
    }
}

async function deleteAlbum(userId, albumName) {
    try {
        const albumNames = await getAlbums(userId);

        if (!albumNames.includes(albumName)) {
            return false;
        }

        const params = {
            TableName: 'user-albums',
            Key: {
                'user-id': userId,
                'albumName': albumName
            }
        };

        await dynamodb.delete(params).promise();
        console.log(`Album '${albumName}' deleted successfully!`);
        return true;
    } catch (error) {
        console.error('Error deleting album:', error);
        throw new Error('Could not delete album');
    }
}

async function removeCard(userId, albumName, position){
  try{
    const album = await getAlbum(userId, albumName);
    if (!album) {
        console.log(`Album '${albumName}' not found.`);
        return;
    }
    if(album.positions[position-1] === null){
        return false;
    }
    album.positions[position-1] = null;
    const params = {
      TableName: 'user-albums',
      Key: {
          'user-id': userId,
          'albumName': albumName
      },
      UpdateExpression: 'SET positions = :positions',
      ExpressionAttributeValues: {
          ':positions': album.positions
      }
    };

    await dynamodb.update(params).promise();
    console.log(`Card at position ${position} removed from album '${albumName}'.`);
  }catch(error) {
        console.error('Error removing card:', error);
        throw new Error('Could not remove card');
    }
 
}

async function replaceCard(userId, albumName, cardId, position){
  try{
    const album = await getAlbum(userId, albumName);
    if (!album) {
        console.log(`Album '${albumName}' not found.`);
        return;
    }
    album.positions[position-1] = cardId;
    const params = {
      TableName: 'user-albums',
      Key: {
          'user-id': userId,
          'albumName': albumName
      },
      UpdateExpression: 'SET positions = :positions',
      ExpressionAttributeValues: {
          ':positions': album.positions
      }
    };

    await dynamodb.update(params).promise();
    console.log(`Card at position ${position} replaced with '${cardId}' in album '${albumName}'.`);
  }catch (error) {
      console.error('Error replacing card:', error);
      throw new Error('Could not replace card');
  }
}

module.exports = {createAlbum, addCardToAlbum, deleteAlbum, getAlbums, generateAlbumImage, getAlbum, removeCard, replaceCard};