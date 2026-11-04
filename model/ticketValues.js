const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class TicketsValues extends Model {}
TicketsValues.init({
    IdTicketValue : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdTicket:DataTypes.INTEGER,
    IdField:DataTypes.INTEGER,
    value:DataTypes.TEXT,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
},{
    sequelize,
    modelName: 'ticketsValues',
  })
module.exports = TicketsValues;