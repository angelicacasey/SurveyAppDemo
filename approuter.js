'use strict'
module.exports = function (app) {
	var clientController = require('./controllers/ClientController');
	var projectController = require('./controllers/ProjectController');
	var employeeController = require('./controllers/EmployeeController');
	var surveyController = require('./controllers/SurveyController');

	app.route('/client')
		.get(clientController.getAllClients)
		.post(clientController.addClient);

	app.route('/client/:id')
		.get(clientController.getClient)
		.put(clientController.updateClient)
		.delete(clientController.deleteClient);

	app.route('/project')
		.get(projectController.getAllProjects)
		.post(projectController.addProject);

	app.route('/project/:id')
		.get(projectController.getProject)
		.put(projectController.updateProject)
		.delete(projectController.deleteProject);

	app.route('/project/byClient/:id')
		.get(projectController.getProjectsForClient);

	app.route('/employee')
		.get(employeeController.getAllEmployees)
		.post(employeeController.addEmployee);

	app.route('/employee/:id')
		.get(employeeController.getEmployee)
		.put(employeeController.updateEmployee)
		.delete(employeeController.deleteEmployee);		

	app.route('/employee/byIdList/')
		.post(employeeController.getEmployeesByIds);

	app.route('/survey')
		.get(surveyController.getAllSurveys)
		.post(surveyController.addSurvey);

	app.route('/survey/:id')
		.get(surveyController.getSurvey)
		.put(surveyController.updateSurvey)
		.delete(surveyController.deleteSurvey);		

};