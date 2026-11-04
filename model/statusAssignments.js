const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class StatusAssignments extends Model {}
StatusAssignments.init({
    IdStatusAssignment : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    event:DataTypes.TEXT,
    IdTicket:DataTypes.INTEGER,
    IdUser:DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'statusAssignments',
  })
module.exports = StatusAssignments;