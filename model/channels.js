const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Channel extends Model {}
Channel.init({
    IdChannel : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'channels', 
  })
module.exports = Channel;