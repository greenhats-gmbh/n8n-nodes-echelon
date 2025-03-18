import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import * as child_process from 'child_process';

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
				displayName: 'Parse Output File as JSON',
				name: 'parseJson',
				type: 'boolean',
				default: false,
				description: 'If the output is a JSON file, it will be parsed and the data will be available for further processing.',
			},
			{
				displayName: 'Parse Output File as JSONL',
				name: 'parseJsonL',
				type: 'boolean',
				default: false,
				description: 'If the output is a JSON-Line file, it will be parsed and the data will be available for further processing.',
			},
			{
				displayName: 'Parse Output File as TEXT per line',
				name: 'parseTextL',
				type: 'boolean',
				default: false,
				description: 'If the output is a TEXT file, it will be parsed and the data will be available for further processing.',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const program = this.getNodeParameter('program', itemIndex, '') as string;
			const argumentValues = this.getNodeParameter('arguments', itemIndex, {}) as any;
			const parseJson = this.getNodeParameter('parseJson', itemIndex, false) as boolean;
			const parseJsonL = this.getNodeParameter('parseJsonL', itemIndex, false) as boolean;
			const parseTextL = this.getNodeParameter('parseTextL', itemIndex, false) as boolean;
			const output_file = `${process.cwd()}/output-${Date.now()}-${Math.random().toString(36).substring(7)}.out`;

			let args: string[] = [];

			if (Array.isArray(argumentValues.argumentValues)) {
				for (const argument of argumentValues.argumentValues) {
					if (argument.parameter) args.push(argument.parameter);
					if (argument.value) args.push(argument.value);
				}
			}
			args = args.map(arg => arg.includes('FILENAME') ? output_file : arg);

			const command = `${program} ${args.join(' ')}`;

			const spawnProcess = (cmd: string, args: string[]) => {
				return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
					const child = child_process.spawn(cmd, args, {
							cwd: process.cwd(),
							env: process.env,
							shell: true,
							stdio: ['ignore', 'pipe', 'pipe'],
					});

					let stdout = '';
					let stderr = '';

					child.stdout.on('data', (data) => {
							stdout += data.toString();
					});

					child.stderr.on('data', (data) => {
							stderr += data.toString();
					});

					child.on('close', (code) => {
							if (code !== 0) {
									reject(new Error(`Command failed with code ${code}: ${stderr}`));
							} else {
									resolve({ stdout, stderr });
							}
					});

					child.on('error', (error) => {
							reject(new Error(`Failed to start process: ${error.message}`));
					});
				});
			};

			try {
				const { stdout, stderr } = await spawnProcess(program, args);
				returnData.push({
					json: {
						command,
						stdout,
						stderr,
						output_file,
					},
				});
			} catch (error) {
				throw new Error(error.message);
			}

			if (parseJson === true) {
				const fs = require('fs');

				if (!fs.existsSync(output_file)) {
					return [];
				}

				const data = fs.readFileSync(output_file, 'utf8');

				try {
					returnData[returnData.length - 1].json.output_file_json_data = JSON.parse(data);
				} catch (error) {
						returnData[returnData.length - 1].json.error_parsing_json = error.message;
				}
			}

			if (parseJsonL === true) {
				const fs = require('fs');

				if (!fs.existsSync(output_file)) {
					return [];
				}

				const data = fs.readFileSync(output_file, 'utf8');

				let output_file_jsonl_data: any[] = [];
				data.split('\n').forEach((line: string) => {
					try {
						output_file_jsonl_data.push(JSON.parse(line));
					} catch (error) {

					}
				});
				returnData[returnData.length - 1].json.output_file_jsonl_data = output_file_jsonl_data;
			}

			if (parseTextL === true) {
				const fs = require('fs');

				if (!fs.existsSync(output_file)) {
					return [];
				}

				const data = fs.readFileSync(output_file, 'utf8');

				returnData[returnData.length - 1].json.output_file_textl_data = data.split('\n');
			}
		}

		return [returnData];
	}
}
