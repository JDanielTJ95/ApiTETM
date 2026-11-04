const {Model, DataTypes} = require('sequelize');
const sequelize = require('../db/config');

class ApplicantMobile extends Model {}
ApplicantMobile.init({
    IdApplicantMobile: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    IdApplicant: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'applicants',
            key: 'IdApplicant'
        }
    },
    token: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Token de Firebase para notificaciones push'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitud de la ubicación del dispositivo'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitud de la ubicación del dispositivo'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Indica si el token está activo'
    },
    lastUsed: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que se usó el token'
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'applicantMobile',
    tableName: 'applicant_mobile',
    timestamps: true,
    indexes: [
        {
            unique: false,
            fields: ['IdApplicant']
        }
    ]
});

module.exports = ApplicantMobile;
