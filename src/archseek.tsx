import {
	Action,
	ActionPanel,
	Icon,
	List,
	showToast,
	Toast,
	Color,
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
import TurndownService, * as Turndown from "turndown"

var turndownService = new TurndownService()
interface SearchResult {
	query: string;
	titles: string[];
	description: string[];
	urls: string[];
}	
/*export async function getWikiPage() : Promise<string> {
	//return "Hello World"
	useEffect(() => {
		fetch('https://wiki.archlinux.org/title/Main_page').then((response) =>{ return response.text();})
	}).then((data) => {return data})
	
	
}
	*/
function useWikiPage(title:any){
	let urlEncodedTitle = encodeURI(title)
	const [wikiText, setWikiText] = useState<string>("Loading content...")
	useEffect(() => {
		fetch(`https://wiki.archlinux.org/api.php?action=parse&page=${urlEncodedTitle}&format=json&prop=text`).then((response) => {
			if (!response.ok) {
				throw new Error('Failed to fetch the page: ${response.status}');
			}
			return response.json();
		}).then((data: any) => {
			setWikiText(data.parse.text["*"])
		})
	},[title])
	return wikiText
}
function useSearchWikiPage(searchTerm: string) {
	const defaultOuput = {} as SearchResult;
	defaultOuput.query =""
	defaultOuput.titles = []
	defaultOuput.description = []
	defaultOuput.urls = []
	const [wikiSearch, setWikiSearch] = useState<SearchResult>(defaultOuput)

	useEffect(() => {
		if (searchTerm.length == 0){
			console.log("searchTerm: " + searchTerm)
			console.log("wikiSearch : " + String(wikiSearch.titles))
			setWikiSearch(defaultOuput)
			return
		}
		//console.log("searchTerm: " + searchTerm)
		let urlEncodedSearchTerm = encodeURI(searchTerm)
		//console.log("urlEncodedSearchTerm: "+ urlEncodedSearchTerm)
		fetch(`https://wiki.archlinux.org/api.php?action=opensearch&search=${urlEncodedSearchTerm}&list=search`).then((response) => {
			if (!response.ok){
				throw new Error('Failed to fetch the search page: ${response.status}');
			}
			//console.log(response)
			return response.json()
		}).then((data) => {
			let typedData = data as [string,string[],string[],string[]]
			const searchResult = {} as SearchResult;
			searchResult.query = typedData[0]
			searchResult.titles = typedData[1]
			searchResult.description = typedData[2]
			searchResult.urls = typedData[3]

			
			setWikiSearch(searchResult)
		})
	},[searchTerm])
	
	return wikiSearch

}

export default function ArchSeek() {
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [state,setState] = useState({ searchText: ""})

	let wikiText = {} as SearchResult;
	wikiText = useSearchWikiPage(query)
	console.log(selectedId)

    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)}>
			{state.searchText === "" && wikiText.titles.length === 0 ? (
				<List.EmptyView title="No Page found" description="Try to search something else." icon={{ source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}} />
) : (

			/*<List.Item title="Open the Arch Wiki" icon="Arch_Linux_logo.svg" actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy url to clipboard" content="https://wiki.archlinux.org/title/Main_page" />
					<Action.OpenInBrowser title="Open in browser" url="https://wiki.archlinux.org/title/Main_page"/>
				</ActionPanel>
			} detail={
			<List.Item.Detail markdown={"# The Arch Wiki\n" + wikiText.titles} />
			} />*/

		 wikiText.titles.map((title, index) =>
			<List.Item id={String(index)} key={title} title={title} detail={
				<List.Item.Detail markdown={turndownService.turndown("<h1>test</h1>")}/>
			}/>
			)
			)
		}
			</List>
	
    );
	}

