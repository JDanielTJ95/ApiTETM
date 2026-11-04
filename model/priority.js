const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Priority extends Model {}
Priority.init({
    IdPriority : {
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
    modelName: 'priority', 
  })
module.exports = Priority;