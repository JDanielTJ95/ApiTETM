const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class SurveyQuestion extends Model {}
SurveyQuestion.init({
    IdSurveyQuestion: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    IdSurvey: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'surveys',
            key: 'IdSurvey'
        }
    },
    question: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    questionType: {
        type: DataTypes.ENUM('open', 'multiple_choice', 'rating', 'yes_no', 'scale'),
        allowNull: false
    },
    options: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Opciones para preguntas de selección múltiple con iconos'
    },
    isRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'surveyQuestion',
    tableName: 'survey_questions',
    timestamps: true
});

module.exports = SurveyQuestion;