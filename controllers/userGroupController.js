const {response} = require('express');
const { Op, Sequelize } = require('sequelize');
const UserGroup = require('../model/userGroup');
const Applicants = require('../model/applicants');

// CRUD Operations para User Groups (Solo Manuales)

// Crear nuevo grupo manual de usuarios
const createUserGroup = async (req, res = response) => {
    try {
        const {
            name,
            description = null,
            memberEmails = [],
            members = [],
            criteria = null
        } = req.body;

        // Validaciones básicas
        if (!name) {
            return res.status(400).json({
                status: false,
                message: 'Name es requerido'
            });
        }

        // Para grupos manuales, verificar que tengan miembros
        if (!members && (!memberEmails || memberEmails.length === 0)) {
            return res.status(400).json({
                status: false,
                message: 'members o memberEmails es requerido para grupos manuales'
            });
        }

        // Verificar si ya existe un grupo con este nombre
        const existingGroup = await UserGroup.findOne({
            where: { name: name }
        });

        if (existingGroup) {
            return res.status(400).json({
                status: false,
                message: 'Ya existe un grupo con este nombre'
            });
        }

        // Procesar members para extraer memberEmails si no se proporcionaron
        let finalMemberEmails = memberEmails;
        let processedMembers = members;

        if (members && members.length > 0) {
            // Extraer emails únicos de los members
            const emailsFromMembers = [...new Set(
                members
                    .filter(member => member.applicantEmail)
                    .map(member => member.applicantEmail)
            )];

            // Si no se proporcionaron memberEmails, usar los de members
            if (!memberEmails || memberEmails.length === 0) {
                finalMemberEmails = emailsFromMembers;
            } else {
                // Combinar y deduplicar
                finalMemberEmails = [...new Set([...memberEmails, ...emailsFromMembers])];
            }

            // Validar que todos los members tengan la información requerida
            const invalidMembers = members.filter(member => 
                !member.applicantEmail || !member.applicantId || !member.ticketNumber
            );

            if (invalidMembers.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: 'Todos los members deben tener applicantEmail, applicantId y ticketNumber'
                });
            }

            // Agregar metadata adicional a cada member
            processedMembers = members.map(member => ({
                ...member,
                addedAt: new Date(),
                source: 'frontend-creation'
            }));
        }

        const userGroup = await UserGroup.create({
            name,
            description,
            type: 'manual',
            criteria,
            memberEmails: finalMemberEmails,
            members: processedMembers, // Guardar información completa de members
            membersCount: finalMemberEmails.length || 0,
            createdBy: req.user_id || 0
        });

        return res.status(201).json({
            status: true,
            message: 'Grupo de usuarios creado exitosamente',
            data: userGroup
        });

    } catch (error) {
        console.error('Error creating user group:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener todos los grupos de usuarios con paginación
const getUserGroups = async (req, res = response) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            isActive = null,
            orderBy = 'createdAt',
            orderDirection = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereConditions = {};

        // Filtro por búsqueda
        if (search) {
            whereConditions[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        // Filtro por estado activo
        if (isActive !== null) {
            whereConditions.isActive = isActive === 'true';
        }

        const { count, rows } = await UserGroup.findAndCountAll({
            where: whereConditions,
            order: [[orderBy, orderDirection]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return res.status(200).json({
            status: true,
            message: 'Grupos obtenidos exitosamente',
            data: {
                groups: rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting user groups:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener un grupo específico por ID
const getUserGroupById = async (req, res = response) => {
    try {
        const { id } = req.params;

        const userGroup = await UserGroup.findByPk(id);

        if (!userGroup) {
            return res.status(404).json({
                status: false,
                message: 'Grupo de usuarios no encontrado'
            });
        }

        // Agregar información de miembros
        const membersInfo = userGroup.getMembers();
        userGroup.setDataValue('membersInfo', membersInfo);

        return res.status(200).json({
            status: true,
            message: 'Grupo obtenido exitosamente',
            data: userGroup
        });

    } catch (error) {
        console.error('Error getting user group by ID:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Actualizar un grupo de usuarios
const updateUserGroup = async (req, res = response) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            isActive,
            memberEmails,
            members,
            criteria
        } = req.body;

        const userGroup = await UserGroup.findByPk(id);

        if (!userGroup) {
            return res.status(404).json({
                status: false,
                message: 'Grupo de usuarios no encontrado'
            });
        }

        // Verificar nombre único si se está cambiando
        if (name && name !== userGroup.name) {
            const existingGroup = await UserGroup.findOne({
                where: { 
                    name: name,
                    id: { [Op.ne]: id }
                }
            });

            if (existingGroup) {
                return res.status(400).json({
                    status: false,
                    message: 'Ya existe un grupo con este nombre'
                });
            }
        }

        // Procesar nuevos miembros si se proporcionan
        let finalMemberEmails = memberEmails;
        let processedMembers = members;
        
        if (members && members.length > 0) {
            const emailsFromMembers = [...new Set(
                members
                    .filter(member => member.applicantEmail)
                    .map(member => member.applicantEmail)
            )];

            if (!memberEmails || memberEmails.length === 0) {
                finalMemberEmails = emailsFromMembers;
            } else {
                finalMemberEmails = [...new Set([...memberEmails, ...emailsFromMembers])];
            }

            // Procesar members con metadata
            processedMembers = members.map(member => ({
                ...member,
                updatedAt: new Date(),
                source: 'frontend-update'
            }));
        }

        // Actualizar campos
        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (criteria !== undefined) updateData.criteria = criteria;
        if (finalMemberEmails) {
            updateData.memberEmails = finalMemberEmails;
            updateData.membersCount = finalMemberEmails.length;
        }
        if (processedMembers) {
            updateData.members = processedMembers;
        }

        await userGroup.update(updateData);

        return res.status(200).json({
            status: true,
            message: 'Grupo actualizado exitosamente',
            data: userGroup
        });

    } catch (error) {
        console.error('Error updating user group:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Eliminar un grupo de usuarios
const deleteUserGroup = async (req, res = response) => {
    try {
        const { id } = req.params;

        const userGroup = await UserGroup.findByPk(id);

        if (!userGroup) {
            return res.status(404).json({
                status: false,
                message: 'Grupo de usuarios no encontrado'
            });
        }

        await userGroup.destroy();

        return res.status(200).json({
            status: true,
            message: 'Grupo eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error deleting user group:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Agregar miembros a un grupo manual
const addMembersToGroup = async (req, res = response) => {
    try {
        const { id } = req.params;
        const { memberEmails = [], members = [] } = req.body;

        const userGroup = await UserGroup.findByPk(id);

        if (!userGroup) {
            return res.status(404).json({
                status: false,
                message: 'Grupo de usuarios no encontrado'
            });
        }

        // Procesar nuevos miembros
        let newEmails = memberEmails;
        let newMembers = [];
        
        if (members && members.length > 0) {
            const emailsFromMembers = members
                .filter(member => member.applicantEmail)
                .map(member => member.applicantEmail);
            
            newEmails = [...newEmails, ...emailsFromMembers];
            
            // Procesar members con metadata
            newMembers = members.map(member => ({
                ...member,
                addedAt: new Date(),
                source: 'manual-addition'
            }));
        }

        // Combinar con emails existentes y deduplicar
        const currentEmails = userGroup.memberEmails || [];
        const updatedEmails = [...new Set([...currentEmails, ...newEmails])];

        // Combinar con members existentes y deduplicar por email
        const currentMembers = userGroup.members || [];
        const currentMemberEmails = currentMembers.map(m => m.applicantEmail);
        const filteredNewMembers = newMembers.filter(
            newMember => !currentMemberEmails.includes(newMember.applicantEmail)
        );
        const updatedMembers = [...currentMembers, ...filteredNewMembers];

        await userGroup.update({
            memberEmails: updatedEmails,
            members: updatedMembers,
            membersCount: updatedEmails.length
        });

        return res.status(200).json({
            status: true,
            message: 'Miembros agregados exitosamente',
            data: {
                addedCount: updatedEmails.length - currentEmails.length,
                totalMembers: updatedEmails.length
            }
        });

    } catch (error) {
        console.error('Error adding members to group:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Remover miembros de un grupo manual
const removeMembersFromGroup = async (req, res = response) => {
    try {
        const { id } = req.params;
        const { memberEmails = [] } = req.body;

        const userGroup = await UserGroup.findByPk(id);

        if (!userGroup) {
            return res.status(404).json({
                status: false,
                message: 'Grupo de usuarios no encontrado'
            });
        }

        // Filtrar emails a remover
        const currentEmails = userGroup.memberEmails || [];
        const updatedEmails = currentEmails.filter(email => !memberEmails.includes(email));

        // Filtrar members a remover
        const currentMembers = userGroup.members || [];
        const updatedMembers = currentMembers.filter(
            member => !memberEmails.includes(member.applicantEmail)
        );

        await userGroup.update({
            memberEmails: updatedEmails,
            members: updatedMembers,
            membersCount: updatedEmails.length
        });

        return res.status(200).json({
            status: true,
            message: 'Miembros removidos exitosamente',
            data: {
                removedCount: currentEmails.length - updatedEmails.length,
                totalMembers: updatedEmails.length
            }
        });

    } catch (error) {
        console.error('Error removing members from group:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener estadísticas de grupos
const getGroupsStatistics = async (req, res = response) => {
    try {
        const totalGroups = await UserGroup.count();
        const activeGroups = await UserGroup.count({ where: { isActive: true } });
        const totalMembers = await UserGroup.sum('membersCount');

        const statistics = {
            totalGroups,
            activeGroups,
            inactiveGroups: totalGroups - activeGroups,
            totalMembers: totalMembers || 0,
            averageMembersPerGroup: totalGroups > 0 ? Math.round((totalMembers || 0) / totalGroups) : 0
        };

        return res.status(200).json({
            status: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: statistics
        });

    } catch (error) {
        console.error('Error getting groups statistics:', error);
        return res.status(500).json({
            status: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = {
    createUserGroup,
    getUserGroups,
    getUserGroupById,
    updateUserGroup,
    deleteUserGroup,
    addMembersToGroup,
    removeMembersFromGroup,
    getGroupsStatistics
};
