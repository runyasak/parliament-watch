import { fetchAssemblies, fetchBills } from '$lib/datasheets';
import { createSeo } from '$lib/seo';
import { AssemblyName, type Assembly } from '$models/assembly';
import { BillProposerType, BillStatus, type Bill } from '$models/bill';
import dayjs from 'dayjs';

const OTHER_CATEGORY_KEY = 'อื่นๆ';

interface FilterOptions {
	mpAssemblies: Assembly[];
	status: BillStatus[];
	categories: string[];
	billProposerType: BillProposerType[];
	proposerNames: string[];
}

interface BillSummary
	extends Pick<
		Bill,
		| 'id'
		| 'title'
		| 'nickname'
		| 'proposedOn'
		| 'categories'
		| 'status'
		| 'proposerType'
		| 'proposedLedByPolitician'
		| 'proposedByPeople'
	> {
	purposedAtMpAssemblyId?: string;
	proposedLedByPoliticianName?: string;
	proposedLedByPeopleName?: string;
}

export async function load() {
	const mpAssemblies = (await fetchAssemblies()).filter(
		({ name }) => name === AssemblyName.Representatives
	);

	const bills: BillSummary[] = (await fetchBills()).map((bill) => {
		const proposedDate = dayjs(bill.proposedOn);

		return {
			...bill,
			categories: bill.categories.length > 0 ? bill.categories : [OTHER_CATEGORY_KEY],
			purposedAtMpAssemblyId: mpAssemblies.find(
				({ startedAt, endedAt }) =>
					proposedDate.isAfter(startedAt) && (!endedAt || proposedDate.isBefore(endedAt))
			)?.id,
			proposedLedByPoliticianName: bill.proposedLedByPolitician
				? `${bill.proposedLedByPolitician.firstname} ${bill.proposedLedByPolitician.lastname}`
				: undefined,
			proposedLedByPeopleName: bill.proposedByPeople?.ledBy
		};
	});

	const billStatuses = Object.values(BillStatus).filter((status) =>
		bills.some((bill) => bill.status === status)
	);

	const billProposerTypes = Object.values(BillProposerType).filter((proposerType) =>
		bills.some((bill) => bill.proposerType === proposerType)
	);

	const proposerNames = [
		...new Set(
			bills
				.filter((bill) => bill.proposedLedByPeopleName || bill.proposedLedByPoliticianName)
				.map(
					(bill) => bill.proposedLedByPeopleName || bill.proposedLedByPoliticianName
				) as string[] /* either of pplName or polName will be present, so it will be a `string` */
		)
	].sort((a, z) => a.localeCompare(z));

	const categories = [...new Set(bills.flatMap((bill) => bill.categories))].sort((a, z) =>
		a.localeCompare(z)
	);

	if (categories.includes(OTHER_CATEGORY_KEY)) {
		categories.splice(categories.indexOf(OTHER_CATEGORY_KEY), 1);
		categories.push(OTHER_CATEGORY_KEY);
	}

	const filterOptions: FilterOptions = {
		mpAssemblies,
		status: billStatuses,
		categories,
		billProposerType: billProposerTypes,
		proposerNames
	};

	return {
		filterOptions,
		bills,
		seo: createSeo({
			title: 'สำรวจร่างกฎหมายในสภาแบบละเอียด'
		})
	};
}
