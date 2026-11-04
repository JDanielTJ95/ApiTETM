const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class TicketAssignments extends Model {}
TicketAssignments.init({
    IdTicketAssignment : {
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
    modelName: 'ticketAssignments',
  })
module.exports = TicketAssignments;