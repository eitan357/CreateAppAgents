'use strict';

const DEPENDENCY_MAP = {
  pmAgent:             [],
  requirementsAnalyst: [],
  systemArchitect:     ['requirementsAnalyst'],
  dataArchitect:       ['requirementsAnalyst', 'systemArchitect'],
  apiDesigner:         ['requirementsAnalyst', 'systemArchitect'],
  frontendArchitect:   ['requirementsAnalyst', 'systemArchitect'],
  backendDev:          ['systemArchitect', 'dataArchitect', 'apiDesigner'],
  frontendDev:         ['systemArchitect', 'frontendArchitect', 'apiDesigner'],
  authAgent:           ['systemArchitect', 'apiDesigner', 'dataArchitect'],
  integrationAgent:    ['systemArchitect', 'apiDesigner'],
  tester:              ['backendDev', 'frontendDev', 'authAgent', 'dataArchitect'],
  security:            ['backendDev', 'authAgent', 'apiDesigner'],
  reviewer:            ['backendDev', 'frontendDev', 'authAgent', 'integrationAgent'],
  devops:              ['systemArchitect', 'backendDev', 'frontendDev'],
  documentation:       ['requirementsAnalyst', 'apiDesigner', 'backendDev', 'frontendDev', 'devops'],
};

module.exports = { DEPENDENCY_MAP };
