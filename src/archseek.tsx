// various import
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
// Turndownservice initialisation (to be able to transform html to markdown)
var turndownService = new TurndownService({codeBlockStyle: `fenced`})
// custom interface to match Arch Wiki's response
interface SearchResult {
	query: string;
	titles: string[];
	description: string[];
	urls: string[];
}	

// Function to get a wiki page from it's title
function useWikiPage(title:any){
	// safety url encoding
	let urlEncodedTitle = encodeURI(title)
	// React thing to show while waiting for actual results
	const [wikiText, setWikiText] = useState<string>("Loading content...")
	useEffect(() => {
		//safety checks
		if (title == null) {
			return
		}
		if (title.length == 0 ){
			return
		}
		//actual fetch command, follow both HTTP redirect and Mediawiki page redirects
		fetch(`https://wiki.archlinux.org/api.php?action=parse&page=${urlEncodedTitle}&format=json&prop=text&redirects=1`,{redirect: 'follow'}).then((response) => {
			if (!response.ok) {

				throw new Error('Failed to fetch the page: ${response.status}');
			}
			// return the response's as json
			return response.json();
		}).then((data: any) => {
			//only parse the html in itself
			setWikiText(data.parse.text["*"])
		})
	// this make sure it only runs if the title change
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
			setWikiSearch(defaultOuput)
			return
		}
		const archWikiUrlRegexMarch = searchTerm.match(/^(https:\/\/)?(wiki.archlinux.org\/title\/)(.*)/)
		// Regex to check if an Arch Wiki url was pasted, if yes only take the title
		if (archWikiUrlRegexMarch){
			//console.log(`Regex matched: ${archWikiUrlRegexMarch[0]}, title is ${archWikiUrlRegexMarch[3]}`)
			searchTerm=archWikiUrlRegexMarch[3]
		}
		
		//console.log("searchTerm: " + searchTerm)
		let urlEncodedSearchTerm = encodeURI(searchTerm)
		//console.log("urlEncodedSearchTerm: "+ urlEncodedSearchTerm)
		console.log(`url fetched: https://wiki.archlinux.org/api.php?action=opensearch&search=${urlEncodedSearchTerm}&list=search`)
		fetch(`https://wiki.archlinux.org/api.php?action=opensearch&search=${urlEncodedSearchTerm}&list=search`).then((response) => {
			if (!response.ok){
				throw new Error(`Failed to fetch the search page: ${response.status}`);
			}
			
			return response.json()
		}).then((data) => {
			console.log(`raw data: ${data}`)
			let typedData = data as [string,string[],string[],string[]]
			console.log(`typedData: ${typedData}`)
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
	let selectedTitle
	let wikiText = {} as SearchResult;

	wikiText = useSearchWikiPage(query)
	console.log(`raw wikiText: ${wikiText}`)
	//console.log(wikiText.titles)
	if (selectedId != null){
		// safety check
		if (Number(selectedId) < wikiText.titles.length) {
			selectedTitle = wikiText.titles[Number(selectedId)]
		} 
	} else {
		selectedTitle = ""
	}
	let wikiPage = useWikiPage(selectedTitle)

	//console.log(selectedId)

    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)}>
			{query === "" && wikiText.titles.length === 0 ? (
				<List.EmptyView title="No Page found" description="Try to search something else." icon={{ source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}} />
) : (
		 wikiText.titles.map((title, index) =>
			<List.Item id={String(index)} key={title} title={title} icon="Arch_Linux_logo.svg" detail={
				<List.Item.Detail markdown={`# ${title}\n\n`+turndownService.turndown(wikiPage)}/>
			} actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy wiki url to clipboard" content={wikiText.urls[index]}/>
					<Action.OpenInBrowser title="Open wiki page in browser" url={wikiText.urls[index]} icon="Arch_Linux_logo.svg"/>
				</ActionPanel>
			}/>
		) 
			)
			
		}
			</List>
	
    );
	}

