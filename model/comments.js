const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class Comments extends Model {}
Comments.init({
    IdComment : {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    IdAuthor: DataTypes.INTEGER,
    body: DataTypes.STRING,
    IdChannel: DataTypes.INTEGER,
    IdTicket: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    authorType: DataTypes.STRING
},{
    sequelize,
    modelName: 'comments', 
  })
module.exports = Comments;