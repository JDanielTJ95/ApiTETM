const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Groups extends Model {}
Groups.init({
    IdGroup : {
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
    modelName: 'groups', 
  })
module.exports = Groups;