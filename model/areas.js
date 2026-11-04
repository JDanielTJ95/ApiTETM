const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Areas extends Model {}
Areas.init({
    IdArea : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    IdUser:DataTypes.INTEGER
},{
    sequelize,
    modelName: 'areas', 
  })
module.exports = Areas;