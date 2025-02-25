import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { exec } from 'child_process';

export class Echelon implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Echelon',
		name: 'Echelon',
		group: ['transform'],
		icon: 'file:echelon.svg',
		version: 1,
		description: 'This node will be used to execute commands on a linux system locally, parses the output and make it available for further processing.',
		defaults: {
			name: 'Echelon',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Program to execute',
				name: 'program',
				type: 'string',
				default: '',
				placeholder: 'legba',
				description: 'The program to execute',
			},
			{
				displayName: 'Use the placeholder FILENAME on the value to pass the placeholder for the filename in the command',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Parse JSON Output File',
				name: 'parseJson',
				type: 'boolean',
				default: false,
				description: 'If the output is a JSON file, it will be parsed and the data will be available for further processing.',
			},
			{
				displayName: 'Arguments',
				name: 'arguments',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Argument',
				description: 'The arguments to pass to the program',
				options: [
					{
						name: 'argumentValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Parameter',
								name: 'parameter',
								type: 'string',
								default: '',
								placeholder: 'e.g. -p',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the parameter',
								placeholder: 'e.g. 8080',
							},
						],
					},
				],
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const program = this.getNodeParameter('program', itemIndex, '') as string;
			const argumentValues = this.getNodeParameter('arguments', itemIndex, {}) as any;
			const parseJson = this.getNodeParameter('parseJson', itemIndex, false) as boolean;
			const output_file = `output-${Date.now()}-${Math.random().toString(36).substring(7)}.out`;

			let program_arguments = '';

			if (Array.isArray(argumentValues.argumentValues)) {
				for (const argument of argumentValues.argumentValues) {
					if (argument.parameter == '' || argument.parameter == null) {
						continue;
					}
					if (argument.value == '' || argument.value == null) {
						program_arguments += ` ${argument.parameter}`;
					} else {
						program_arguments += ` ${argument.parameter} '${argument.value}'`;
					}
				}
			}

			if (program_arguments.includes('FILENAME')) {
				program_arguments = program_arguments.replace('FILENAME', output_file);
			}

			const command = `${program}${program_arguments}`;

			const execAsync = (cmd: string) => {
				return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
					exec(cmd, (error, stdout, stderr) => {
						if (error) {
							reject(error);
						} else {
							resolve({ stdout, stderr });
						}
					});
				});
			};

			try {
				const { stdout, stderr } = await execAsync(command);
				returnData.push({
					json: {
						command,
						stdout,
						stderr,
					},
				});
			} catch (error) {
				returnData.push({
					json: {
						command,
						error: error.message,
					},
				});
			}

			if (parseJson === true) {
				const fs = require('fs');
				const data = fs.readFileSync(output_file, 'utf8');

				returnData.push({
					json: {
						output_file_json_data: JSON.parse(data),
					}
				});
			}
			if (program_arguments.includes('FILENAME')) {
				returnData.push({
					json: {
						output_file: output_file,
					},
				});
			}
		}

		return [returnData];
	}
}
