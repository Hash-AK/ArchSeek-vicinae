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
/*export async function getWikiPage() : Promise<string> {
	//return "Hello World"
	useEffect(() => {
		fetch('https://wiki.archlinux.org/title/Main_page').then((response) =>{ return response.text();})
	}).then((data) => {return data})
	
	
}
	*/
function useWikiPage(){
	const [wikiText, setWikiText] = useState<string>("Loading content...")
	useEffect(() => {
		fetch('https://wiki.archlinux.org/api.php?action=parse&page=Main_page&format=json&prop=text').then((response) => {
			if (!response.ok) {
				throw new Error('Failed to fetch the page: ${response.status}');
			}
			return response.json();
		}).then((data: any) => {
			setWikiText(data.parse.text["*"])
		})
	},[])
	return wikiText
}
function useSearchWikiPage(searchTerm: string) {
	const defaultOuput = {} as SearchResult;
	defaultOuput.query =""
	defaultOuput.titles = ["Please enter a search term to start"]
	const [wikiSearch, setWikiSearch] = useState<SearchResult>(defaultOuput)
	interface SearchResult {
	query: string;
	titles: string[];
	emptyThing: string[];
	urls: string[];
	}	
	useEffect(() => {
		fetch(`https://wiki.archlinux.org/api.php?action=opensearch&search=${searchTerm}&list=search`).then((response) => {
			if (!response.ok){
				throw new Error('Failed to fetch the search page: ${response.status}');
			}
			return response.json()
		}).then((data) => {
			let typedData = data as [string,string[],string[],string[]]
			const searchResult = {} as SearchResult;
			searchResult.query = typedData[0]
			searchResult.titles = typedData[1]
			searchResult.emptyThing = typedData[2]
			searchResult.urls = typedData[3]

			
			setWikiSearch(searchResult)
		})
	},[searchTerm])
	return wikiSearch

}

export default function ArchSeek() {
	//const wikiText = useWikiPage()
	const [query, setQuery] = useState("");
	const wikiText = useSearchWikiPage(query)

    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start">
			<List.Item title="Open the Arch Wiki" icon="Arch_Linux_logo.svg" actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy url to clipboard" content="https://wiki.archlinux.org/title/Main_page" />
					<Action.OpenInBrowser title="Open in browser" url="https://wiki.archlinux.org/title/Main_page"/>
				</ActionPanel>
			} detail={
			<List.Item.Detail markdown={"# The Arch Wiki\n" + wikiText.titles[0]} />
			} />
			<List.EmptyView title="No Page found" description="Try to search something else." icon={{ source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}} />
			</List>
	
    );
	}

